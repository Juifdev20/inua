package com.hospital.backend.service.impl;

import com.hospital.backend.dto.AdmissionDTO;
import com.hospital.backend.dto.InvoiceDTO;
import com.hospital.backend.entity.Admission;
import com.hospital.backend.entity.Currency;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.User;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.AdmissionRepository;
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

        // Vérifier si c'est la première admission du patient (frais de dossier une seule fois)
        Long patientId = patient.getId();
        boolean isFirstAdmission = !admissionRepository.existsByPatientId(patientId);

        // Calculer les montants pour l'admission
        BigDecimal registrationFee = BigDecimal.ZERO;
        if (isFirstAdmission) {
            // Seulement lors de la première admission, récupérer le montant de la fiche
            registrationFee = pricingService.getFicheAmount(patientId);
        }

        // Montant du service/consultation
        BigDecimal serviceFee = dto.getTotalAmount() != null ? dto.getTotalAmount() : BigDecimal.ZERO;

        // Calculer le montant total (registration_fee + service_fee)
        BigDecimal totalAmount = registrationFee.add(serviceFee);

        log.info("💰 Montants admission - Registration: {} USD, Service: {} USD, Total: {} USD",
            registrationFee, serviceFee, totalAmount);

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
                .status(dto.getStatus() != null ? dto.getStatus() : Admission.AdmissionStatus.EN_ATTENTE)
                .registrationFee(registrationFee)
                .serviceFee(serviceFee)
                .totalAmount(totalAmount.compareTo(java.math.BigDecimal.ZERO) > 0 ? totalAmount : java.math.BigDecimal.ZERO)
                .build();

        Admission saved = admissionRepository.save(admission);
        log.info("Admission créée avec succès ID: {}, Total: {}", saved.getId(), saved.getTotalAmount());

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
                .createdAt(admission.getCreatedAt())
                .updatedAt(admission.getUpdatedAt())
                .build();
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
