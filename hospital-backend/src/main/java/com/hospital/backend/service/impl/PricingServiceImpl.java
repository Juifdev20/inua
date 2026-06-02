package com.hospital.backend.service.impl;

import com.hospital.backend.entity.*;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.PricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Implémentation du service de tarification
 * Gère le calcul automatique des montants lors des admissions
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PricingServiceImpl implements PricingService {

    private final PriceListRepository priceListRepository;
    private final ConsultationRepository consultationRepository;
    private final InvoiceRepository invoiceRepository;
    private final PatientRepository patientRepository;
    private final HospitalConfigRepository hospitalConfigRepository;
    private final MedicalServiceRepository medicalServiceRepository;
    private final AdmissionRepository admissionRepository;

    // Taux de change: 1 USD = 2600 CDF (à externaliser en configuration)
    private static final BigDecimal USD_TO_CDF = new BigDecimal("2600");
    private static final BigDecimal CDF_TO_USD = new BigDecimal("0.0003846");

    // Validité de la fiche patient en mois
    private static final int FICHE_VALIDITY_MONTHS = 12;

    @Override
    public BigDecimal getCurrentPrice(PriceListType type) {
        Optional<PriceList> price = priceListRepository.findActivePriceByType(type, LocalDateTime.now());
        return price.map(PriceList::getUnitPrice).orElse(null);
    }

    @Override
    public List<Map<String, Object>> getAllActivePrices() {
        List<PriceList> prices = priceListRepository.findAllActivePrices();
        return prices.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> calculateAdmissionAmount(Long patientId, Long serviceId) {
        Map<String, Object> result = new HashMap<>();

        // 1. Calculer le montant de la fiche (en USD par défaut)
        BigDecimal ficheAmount = getFicheAmount(patientId);
        boolean hasActiveFile = hasActiveFile(patientId);

        // 2. Calculer le montant de la consultation
        BigDecimal consulAmount = BigDecimal.ZERO;
        String serviceName = "";
        Currency serviceCurrency = Currency.USD; // Par défaut USD
        
        if (serviceId != null) {
            MedicalService service = medicalServiceRepository.findById(serviceId).orElse(null);
            if (service != null) {
                consulAmount = BigDecimal.valueOf(service.getPrix() != null ? service.getPrix() : 0);
                serviceName = service.getNom();
                serviceCurrency = service.getCurrency() != null ? service.getCurrency() : Currency.USD;
            }
        }

        // 3. Garder les montants en USD (pas de conversion)
        BigDecimal totalAmount = ficheAmount.add(consulAmount);
        
        log.info("💰 Calcul admission - Fiche: {} USD, Consultation: {} USD, Total: {} USD",
            ficheAmount, consulAmount, totalAmount);

        result.put("ficheAmount", ficheAmount);
        result.put("ficheAmountOriginal", ficheAmount);
        result.put("ficheCurrency", Currency.USD.name());
        result.put("ficheRequired", !hasActiveFile);
        result.put("consulAmount", consulAmount);
        result.put("serviceName", serviceName);
        result.put("serviceCurrency", Currency.USD.name());
        result.put("totalAmount", totalAmount);
        result.put("totalCurrency", Currency.USD.name());
        result.put("hasActiveFile", hasActiveFile);

        return result;
    }

    /**
     * Convertit un montant d'une devise à une autre
     */
    private BigDecimal convertCurrency(BigDecimal amount, Currency from, Currency to) {
        if (from == to || amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            return amount;
        }
        
        if (from == Currency.CDF && to == Currency.USD) {
            return amount.multiply(CDF_TO_USD).setScale(2, BigDecimal.ROUND_HALF_UP);
        } else if (from == Currency.USD && to == Currency.CDF) {
            return amount.multiply(USD_TO_CDF).setScale(2, BigDecimal.ROUND_HALF_UP);
        }
        
        return amount;
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getFicheAmount(Long patientId) {
        // Toujours retourner le montant de la fiche configuré
        // C'est au caller (hasActiveFile) de décider si elle doit être facturée ou non
        return getFicheAmountWithoutCheck(patientId);
    }

    /**
     * Récupère le montant de la fiche converti dans la devise demandée (sans vérification d'existence)
     * Utilisé uniquement lors de la première admission
     */
    public BigDecimal getFicheAmountWithoutCheck(Long patientId) {
        return getFicheAmountWithoutCheck(patientId, Currency.USD);
    }

    /**
     * Récupère le montant de la fiche converti dans la devise demandée (sans vérification d'existence)
     */
    public BigDecimal getFicheAmountWithoutCheck(Long patientId, Currency targetCurrency) {

        // Récupérer la configuration hospitalière (toujours frais depuis la DB - pas de cache)
        HospitalConfig config = hospitalConfigRepository.findFirstByOrderByIdAsc().orElse(null);
        
        BigDecimal fichePrice;
        Currency ficheCurrency;
        
        if (config == null || config.getFichePrice() == null) {
            // Valeur par défaut si non défini (3 USD)
            log.warn("⚠️ Prix de la fiche non défini dans la config hospitalière, utilisation de la valeur par défaut 3 USD");
            fichePrice = new BigDecimal("3");
            ficheCurrency = Currency.USD;
        } else {
            fichePrice = config.getFichePrice();
            ficheCurrency = config.getFichePriceCurrency() != null ? config.getFichePriceCurrency() : Currency.USD;
            log.info("📋 Config frais de fiche lue depuis DB: {} {}", fichePrice, ficheCurrency);
        }
        
        // Convertir dans la devise demandée si nécessaire
        if (ficheCurrency != targetCurrency) {
            BigDecimal converted = convertCurrency(fichePrice, ficheCurrency, targetCurrency);
            log.info("💱 Conversion frais de fiche: {} {} -> {} {}", fichePrice, ficheCurrency, converted, targetCurrency);
            return converted;
        }
        
        return fichePrice;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasActiveFile(Long patientId) {
        LocalDateTime twelveMonthsAgo = LocalDateTime.now().minusMonths(FICHE_VALIDITY_MONTHS);

        // 1. Vérifier dans les admissions : une fiche a été facturée (registrationFee > 0)
        //    et l'admission n'est pas annulée
        List<Admission> admissions = admissionRepository.findByPatientId(patientId);
        for (Admission a : admissions) {
            if (a.getAdmissionDate() != null && a.getAdmissionDate().isAfter(twelveMonthsAgo)) {
                if (a.getRegistrationFee() != null && a.getRegistrationFee().compareTo(BigDecimal.ZERO) > 0) {
                    if (a.getStatus() != null && a.getStatus() != Admission.AdmissionStatus.ANNULE) {
                        log.info("📋 Fiche active trouvée dans admission ID={} (registrationFee={})",
                                a.getId(), a.getRegistrationFee());
                        return true;
                    }
                }
            }
        }

        // 2. Vérifier dans les consultations (compatibilité legacy)
        List<Consultation> consultations = consultationRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        for (Consultation c : consultations) {
            if (c.getCreatedAt() != null && c.getCreatedAt().isAfter(twelveMonthsAgo)) {
                if (c.getFicheAmountPaid() != null && c.getFicheAmountPaid() > 0) {
                    log.info("📋 Fiche active trouvée dans consultation ID={} (ficheAmountPaid={})",
                            c.getId(), c.getFicheAmountPaid());
                    return true;
                }
            }
        }

        log.info("📋 Aucune fiche active pour patientId={} - frais de fiche requis", patientId);
        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public LocalDateTime getLastFichePaymentDate(Long patientId) {
        LocalDateTime twelveMonthsAgo = LocalDateTime.now().minusMonths(FICHE_VALIDITY_MONTHS);
        LocalDateTime lastPayment = null;
        
        // Chercher dans les consultations
        List<Consultation> consultations = consultationRepository
            .findByPatientIdOrderByCreatedAtDesc(patientId);
        
        for (Consultation c : consultations) {
            if (c.getCreatedAt() != null && c.getCreatedAt().isAfter(twelveMonthsAgo)) {
                if (c.getFicheAmountPaid() != null && c.getFicheAmountPaid() > 0) {
                    if (lastPayment == null || c.getCreatedAt().isAfter(lastPayment)) {
                        lastPayment = c.getCreatedAt();
                    }
                }
            }
        }
        
        return lastPayment;
    }

    @Override
    @Transactional
    public Map<String, Object> updatePrice(Long id, BigDecimal newPrice) {
        PriceList price = priceListRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Prix non trouvé: " + id));
        
        price.setUnitPrice(newPrice);
        price = priceListRepository.save(price);
        
        return mapToDTO(price);
    }

    @Override
    @Transactional
    public Map<String, Object> createPrice(Map<String, Object> priceData) {
        PriceList price = PriceList.builder()
            .serviceType(PriceListType.valueOf((String) priceData.get("serviceType")))
            .nom((String) priceData.get("nom"))
            .unitPrice(new BigDecimal(priceData.get("unitPrice").toString()))
            .description((String) priceData.get("description"))
            .isActive(true)
            .validFrom(LocalDateTime.now())
            .build();
        
        price = priceListRepository.save(price);
        return mapToDTO(price);
    }

    @Override
    @Transactional
    public void initializeDefaultPrices() {
        // Vérifier si des prix existent déjà
        if (!priceListRepository.findAllActivePrices().isEmpty()) {
            log.info("✅ Grille tarifaire déjà initialisée");
            return;
        }

        log.info("📋 Initialisation de la grille tarifaire par défaut...");
        
        List<PriceList> defaultPrices = List.of(
            PriceList.builder()
                .serviceType(PriceListType.FICHE)
                .nom("Frais de dossier patient")
                .unitPrice(new BigDecimal("5000"))
                .description("Frais de création/mise à jour du dossier patient")
                .isActive(true)
                .validFrom(LocalDateTime.now())
                .build(),
            PriceList.builder()
                .serviceType(PriceListType.CONSULTATION_GENERALE)
                .nom("Consultation Générale")
                .unitPrice(new BigDecimal("3000"))
                .description("Consultation avec médecin généraliste")
                .isActive(true)
                .validFrom(LocalDateTime.now())
                .build(),
            PriceList.builder()
                .serviceType(PriceListType.CONSULTATION_SPECIALISTE)
                .nom("Consultation Spécialiste")
                .unitPrice(new BigDecimal("10000"))
                .description("Consultation avec médecin spécialiste")
                .isActive(true)
                .validFrom(LocalDateTime.now())
                .build(),
            PriceList.builder()
                .serviceType(PriceListType.URGENCE)
                .nom("Consultation d'Urgence")
                .unitPrice(new BigDecimal("15000"))
                .description(" Consultation en urgence")
                .isActive(true)
                .validFrom(LocalDateTime.now())
                .build()
        );
        
        priceListRepository.saveAll(defaultPrices);
        log.info("✅ Grille tarifaire initialisée avec {} prix par défaut", defaultPrices.size());
    }

    private Map<String, Object> mapToDTO(PriceList price) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", price.getId());
        dto.put("serviceType", price.getServiceType().name());
        dto.put("nom", price.getNom());
        dto.put("unitPrice", price.getUnitPrice());
        dto.put("description", price.getDescription());
        dto.put("isActive", price.getIsActive());
        dto.put("validFrom", price.getValidFrom());
        dto.put("validUntil", price.getValidUntil());
        return dto;
    }
}

