package com.hospital.backend.service.impl;

import com.hospital.backend.dto.AdmissionDTO;
import com.hospital.backend.dto.InvoiceDTO;
import com.hospital.backend.entity.Admission;
import com.hospital.backend.entity.Company;
import com.hospital.backend.entity.Currency;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.SubscriptionStatus;
import com.hospital.backend.entity.User;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.AdmissionRepository;
import com.hospital.backend.repository.CompanyRepository;
import com.hospital.backend.repository.PatientRepository;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.service.AdmissionService;
import com.hospital.backend.service.InvoiceService;
import com.hospital.backend.service.PricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdmissionServiceImpl implements AdmissionService {

    // Taux de change: 1 USD = 2600 CDF (à externaliser en configuration)
    private static final BigDecimal USD_TO_CDF = new BigDecimal("2600");
    private static final BigDecimal CDF_TO_USD = new BigDecimal("0.0003846");

    private final AdmissionRepository admissionRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final PricingService pricingService;
    private final InvoiceService invoiceService;
    private final CompanyRepository companyRepository;

    @Override
    @Transactional(readOnly = true)
    public AdmissionDTO getById(Long id) {
        Admission admission = admissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admission introuvable avec l'ID: " + id));
        return mapToDTO(admission);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdmissionDTO> getAll() {
        return admissionRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdmissionDTO> getByPatientId(Long patientId) {
        return admissionRepository.findByPatientId(patientId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public AdmissionDTO create(AdmissionDTO dto) {
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient introuvable avec l'ID: " + dto.getPatientId()));

        User doctor = userRepository.findById(dto.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Docteur introuvable avec l'ID: " + dto.getDoctorId()));

        // Vérifier si le patient a une fiche active (payée dans les 12 derniers mois)
        // Même logique que ConsultationServiceImpl pour harmonisation
        Long patientId = patient.getId();
        boolean hasActiveFiche = hasActiveFiche(patientId);

        // Calculer les montants pour l'admission
        BigDecimal registrationFee = BigDecimal.ZERO;
        if (!hasActiveFiche) {
            // Seulement si pas de fiche active, récupérer le montant de la fiche
            registrationFee = pricingService.getFicheAmount(patientId);
        }

        // Montant du service/consultation
        BigDecimal serviceFee = dto.getTotalAmount() != null ? dto.getTotalAmount() : BigDecimal.ZERO;

        // ===================== ABONNÉ =====================
        boolean isAbonne = Boolean.TRUE.equals(dto.getIsAbonne());
        Company company = null;
        BigDecimal coverageRate = null;
        BigDecimal companyCoverage = BigDecimal.ZERO;
        BigDecimal patientSurplus = BigDecimal.ZERO;

        if (isAbonne) {
            if (dto.getCompanyId() == null) {
                throw new IllegalArgumentException("companyId est obligatoire pour un patient abonné");
            }
            company = companyRepository.findById(dto.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Entreprise introuvable: " + dto.getCompanyId()));
            if (company.getSubscriptionStatus() != SubscriptionStatus.ACTIVE) {
                throw new IllegalStateException(
                        "L'abonnement de l'entreprise " + company.getName() + " n'est pas ACTIF");
            }

            coverageRate = company.getCoverageRate() != null
                    ? company.getCoverageRate() : new BigDecimal("100.00");

            // Calculer les parts
            BigDecimal total = registrationFee.add(serviceFee);
            if (total.compareTo(BigDecimal.ZERO) > 0 && coverageRate.compareTo(new BigDecimal("100")) < 0) {
                // Ticket modeste : le patient paie le reste
                companyCoverage = total.multiply(coverageRate)
                        .divide(new BigDecimal("100"), 2, BigDecimal.ROUND_HALF_UP);
                patientSurplus = total.subtract(companyCoverage);
                log.info("💳 Admission ABONNÉ - entreprise={}, matricule={}, coverage={}%, company={}, patient={}",
                        company.getName(), dto.getMatricule(), coverageRate, companyCoverage, patientSurplus);
            } else if (total.compareTo(BigDecimal.ZERO) > 0) {
                // Couverture totale
                companyCoverage = total;
                patientSurplus = BigDecimal.ZERO;
                log.info("💳 Admission ABONNÉ (100%) - entreprise={}, matricule={}",
                        company.getName(), dto.getMatricule());
            } else {
                // Montants déjà à zéro
                registrationFee = BigDecimal.ZERO;
                serviceFee = BigDecimal.ZERO;
            }
        }

        // Calculer le montant total (registration_fee + service_fee)
        BigDecimal totalAmount = registrationFee.add(serviceFee);

        // Pour un patient abonné, le montant à percevoir à la caisse = surplus patient uniquement
        // (la part entreprise est facturée à l'entreprise, pas à la caisse)
        BigDecimal billedToPatient = isAbonne ? patientSurplus : totalAmount;

        log.info("💰 Montants admission - Registration: {} USD, Service: {} USD, Total: {} USD, BilledToPatient: {} USD (abonné={})",
            registrationFee, serviceFee, totalAmount, billedToPatient, isAbonne);

        Admission admission = Admission.builder()
                .patient(patient)
                .doctor(doctor)
                .admissionDate(dto.getAdmissionDate() != null ? dto.getAdmissionDate() : LocalDateTime.now())
                .poids(dto.getPoids())
                .temperature(dto.getTemperature())
                .taille(dto.getTaille())
                .tensionArterielle(dto.getTensionArterielle())
                .reasonForVisit(dto.getReasonForVisit())
                .symptoms(dto.getSymptoms())
                .notes(dto.getNotes())
                // Abonné 100% couvert : totalAmount=0, filtre caisse (paid<total) l'exclut automatiquement
                .status(dto.getStatus() != null ? dto.getStatus() : Admission.AdmissionStatus.EN_ATTENTE)
                .registrationFee(registrationFee)
                .serviceFee(serviceFee)
                .totalAmount(billedToPatient)
                .isAbonne(isAbonne)
                .company(company)
                .matricule(isAbonne ? dto.getMatricule() : null)
                .coverageRate(coverageRate)
                .companyCoverage(companyCoverage)
                .patientSurplus(patientSurplus)
                .build();

        Admission saved = admissionRepository.save(admission);
        log.info("Admission créée avec succès ID: {}, Total: {}", saved.getId(), saved.getTotalAmount());

        // ⛔ Patient ABONNÉ 100% : aucune facture caisse n'est créée.
        //    Ticket modeste : une facture caisse est créée pour le surplus patient.
        if (isAbonne && patientSurplus.compareTo(BigDecimal.ZERO) == 0) {
            log.info("💳 Patient ABONNÉ 100% - aucune transaction caisse (admission ID={})", saved.getId());
            return mapToDTO(saved);
        } else if (isAbonne) {
            log.info("💳 Patient ABONNÉ ticket modeste - facture caisse créée pour {} USD (admission ID={})",
                    patientSurplus, saved.getId());
            // Créer une facture pour le surplus uniquement
            InvoiceDTO invoice = invoiceService.createAdmissionInvoice(
                    patientId, null, BigDecimal.ZERO, patientSurplus,
                    dto.getReasonForVisit(), doctor
            );
            log.info("✅ Facture ticket modeste créée - ID: {}, Surplus: {} USD", invoice.getId(), patientSurplus);
            return mapToDTO(saved);
        }

        // Log des frais de fiche
        if (registrationFee.compareTo(BigDecimal.ZERO) > 0) {
            log.info("💰 Nouvelle fiche détectée pour le patient {} - Montant: {} USD", patientId, registrationFee);
        } else {
            log.info("📝 Fiche déjà payée pour le patient {} - Pas de frais de fiche", patientId);
        }

        // Créer la facture d'admission avec frais de fiche (si applicable)
        InvoiceDTO invoice = invoiceService.createAdmissionInvoice(
                patientId,
                null, // Pas de consultation liée à ce stade
                registrationFee, // Montant en USD pour la facture
                serviceFee, // Montant consultation
                dto.getReasonForVisit(),
                doctor
        );

        log.info("✅ Facture d'admission créée - ID: {}, Fiche: {} USD, Total: {}",
                invoice.getId(), registrationFee.compareTo(BigDecimal.ZERO) > 0 ? registrationFee : "0 (déjà payée)", invoice.getTotalAmount());
        
        return mapToDTO(saved);
    }

    @Override
    public AdmissionDTO update(Long id, AdmissionDTO dto) {
        Admission admission = admissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admission introuvable avec l'ID: " + id));

        // Mise à jour des champs
        if (dto.getPoids() != null) admission.setPoids(dto.getPoids());
        if (dto.getTemperature() != null) admission.setTemperature(dto.getTemperature());
        if (dto.getTaille() != null) admission.setTaille(dto.getTaille());
        if (dto.getTensionArterielle() != null) admission.setTensionArterielle(dto.getTensionArterielle());
        if (dto.getReasonForVisit() != null) admission.setReasonForVisit(dto.getReasonForVisit());
        if (dto.getSymptoms() != null) admission.setSymptoms(dto.getSymptoms());
        if (dto.getNotes() != null) admission.setNotes(dto.getNotes());
        if (dto.getStatus() != null) admission.setStatus(dto.getStatus());
        if (dto.getTotalAmount() != null) admission.setTotalAmount(dto.getTotalAmount());

        Admission updated = admissionRepository.save(admission);
        log.info("Admission mise à jour avec succès ID: {}", updated.getId());
        
        return mapToDTO(updated);
    }

    @Override
    public void delete(Long id) {
        Admission admission = admissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admission introuvable avec l'ID: " + id));
        
        admissionRepository.delete(admission);
        log.info("Admission supprimée avec succès ID: {}", id);
    }

    private AdmissionDTO mapToDTO(Admission admission) {
        return AdmissionDTO.builder()
                .id(admission.getId())
                .patientId(admission.getPatient() != null ? admission.getPatient().getId() : null)
                .patientName(admission.getPatient() != null ?
                        admission.getPatient().getFirstName() + " " + admission.getPatient().getLastName() : null)
                .doctorId(admission.getDoctor() != null ? admission.getDoctor().getId() : null)
                .doctorName(admission.getDoctor() != null ?
                        admission.getDoctor().getFirstName() + " " + admission.getDoctor().getLastName() : null)
                .admissionDate(admission.getAdmissionDate())
                .poids(admission.getPoids())
                .temperature(admission.getTemperature())
                .taille(admission.getTaille())
                .tensionArterielle(admission.getTensionArterielle())
                .reasonForVisit(admission.getReasonForVisit())
                .symptoms(admission.getSymptoms())
                .notes(admission.getNotes())
                .status(admission.getStatus())
                .registrationFee(admission.getRegistrationFee())
                .serviceFee(admission.getServiceFee())
                .totalAmount(admission.getTotalAmount())
                .isAbonne(Boolean.TRUE.equals(admission.getIsAbonne()))
                .companyId(admission.getCompany() != null ? admission.getCompany().getId() : null)
                .companyName(admission.getCompany() != null ? admission.getCompany().getName() : null)
                .matricule(admission.getMatricule())
                .coverageRate(admission.getCoverageRate())
                .companyCoverage(admission.getCompanyCoverage())
                .patientSurplus(admission.getPatientSurplus())
                .createdAt(admission.getCreatedAt())
                .updatedAt(admission.getUpdatedAt())
                .build();
    }

    /**
     * Vérifie si le patient a une fiche active (payée dans les 12 derniers mois)
     * Même logique que ConsultationServiceImpl pour harmonisation
     */
    private boolean hasActiveFiche(Long patientId) {
        LocalDateTime twelveMonthsAgo = LocalDateTime.now().minusMonths(12);
        
        List<Admission> admissions = admissionRepository.findByPatientId(patientId);
        
        for (Admission a : admissions) {
            if (a.getAdmissionDate() != null && a.getAdmissionDate().isAfter(twelveMonthsAgo)) {
                // Vérifier si le montant de la fiche a été payé
                if (a.getAmountPaid() != null && a.getAmountPaid().compareTo(BigDecimal.ZERO) > 0) {
                    return true;
                }
            }
        }
        return false;
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
}
