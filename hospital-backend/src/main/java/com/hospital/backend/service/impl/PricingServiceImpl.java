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
import java.util.*;
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

        // 1. Calculer le montant de la fiche
        BigDecimal ficheAmount = getFicheAmount(patientId);
        boolean hasActiveFile = hasActiveFile(patientId);

        // 2. Calculer le montant de la consultation
        BigDecimal consulAmount = BigDecimal.ZERO;
        String serviceName = "";
        
        if (serviceId != null) {
            // Chercher le service dans MedicalService (services médicaux)
            // Le prix viene du MedicalService, pas de PriceList
            // Donc on utilise la logique existante
            // TODO: Intégrer avec MedicalService si nécessaire
        }

        result.put("ficheAmount", ficheAmount);
        result.put("ficheRequired", !hasActiveFile); // true si nouvelle fiche
        result.put("consulAmount", consulAmount);
        result.put("serviceName", serviceName);
        result.put("totalAmount", ficheAmount.add(consulAmount));
        result.put("hasActiveFile", hasActiveFile);

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getFicheAmount(Long patientId) {
        // Vérifier si le patient a déjà une fiche active (payée dans les 12 derniers mois)
        if (hasActiveFile(patientId)) {
            return BigDecimal.ZERO; // Fiche déjà payée
        }

        // Récupérer le prix de la fiche depuis la grille tarifaire
        BigDecimal fichePrice = getCurrentPrice(PriceListType.FICHE);
        
        if (fichePrice == null) {
            // Valeur par défaut si pas5000 CDF de prix défini ( = ~5$)
            log.warn("⚠️ Prix de la fiche non défini dans la grille tarifaire, utilisation de la valeur par défaut");
            return new BigDecimal("5000");
        }
        
        return fichePrice;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasActiveFile(Long patientId) {
        // Chercher la dernière consultation payée avec FICHE
        // La fiche est valide 12 mois à partir de la date de paiement
        LocalDateTime twelveMonthsAgo = LocalDateTime.now().minusMonths(FICHE_VALIDITY_MONTHS);
        
        List<Consultation> consultations = consultationRepository
            .findByPatientIdOrderByCreatedAtDesc(patientId);
        
        for (Consultation c : consultations) {
            // Vérifier si la fiche a été payée dans les 12 derniers mois
            if (c.getCreatedAt() != null && c.getCreatedAt().isAfter(twelveMonthsAgo)) {
                // Vérifier si le montant de la fiche a été payé
                if (c.getFicheAmountPaid() != null && c.getFicheAmountPaid() > 0) {
                    return true;
                }
            }
        }
        
        // Alternative: Vérifier dans les factures
        Optional<Patient> patient = patientRepository.findById(patientId);
        if (patient.isPresent()) {
            List<Invoice> invoices = invoiceRepository.findByPatientId(patient.get().getId(), 
                org.springframework.data.domain.Pageable.ofSize(100)).getContent();
            
            for (Invoice inv : invoices) {
                // Chercher une facture payée avec un item de type FICHE
                if (inv.getStatus() == InvoiceStatus.PAYEE && inv.getItems() != null) {
                    for (InvoiceItem item : inv.getItems()) {
                        if (item.getItemType() == InvoiceItemType.FICHE) {
                            // Vérifier si la date de paiement est dans les 12 derniers mois
                            if (inv.getPaidAt() != null && inv.getPaidAt().isAfter(twelveMonthsAgo)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        
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

