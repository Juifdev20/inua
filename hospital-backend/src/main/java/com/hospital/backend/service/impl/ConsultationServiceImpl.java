package com.hospital.backend.service.impl;

import com.hospital.backend.dto.AdmissionDTO;
import com.hospital.backend.dto.AdjustExamRequest.ExamAdjustmentDTO;
import com.hospital.backend.dto.ConsultationDTO;
import com.hospital.backend.dto.ConsultationListDTO;
import com.hospital.backend.dto.DecisionRequest;
import com.hospital.backend.dto.FinaliserConsultationRequest;
import com.hospital.backend.dto.TerminationDTO;
import com.hospital.backend.dto.ExamItemDTO;
import com.hospital.backend.dto.MedicalServiceDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.dto.PatientJourneyDTO;
import com.hospital.backend.dto.PrescriptionDTO;
import com.hospital.backend.dto.RevenueDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;
import com.hospital.backend.security.CustomUserDetails;
import com.hospital.backend.security.HospitalTenantContext;
import com.hospital.backend.service.CompanyConsumptionService;
import com.hospital.backend.service.ConsultationService;
import com.hospital.backend.service.LabAlertService;
import com.hospital.backend.service.NotificationService;
import com.hospital.backend.service.PatientDocumentService;
import com.hospital.backend.service.RevenueService;
import com.hospital.backend.service.PrescriptionService;
import jakarta.persistence.EntityGraph;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.hospital.backend.entity.ConsultationStatus.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConsultationServiceImpl implements ConsultationService {

    private final ConsultationRepository consultationRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final LabAlertService labAlertService;
    private final MedicalServiceRepository serviceRepository;
    private final AdmissionRepository admissionRepository;
    private final PrescribedExamRepository prescribedExamRepository;
    private final LabTestRepository labTestRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final EntityManager entityManager;
    private final RevenueService revenueService;
    private final HospitalConfigRepository hospitalConfigRepository;
    private final PatientDocumentService patientDocumentService;
    @Autowired
    @Lazy
    private PrescriptionService prescriptionService;
    private final ExamenRepository examenRepository;
    private final com.hospital.backend.repository.CompanyRepository companyRepository;
    private final CompanyConsumptionService consumptionService;

    private final Object ficheNumberLock = new Object();
    private final Object numeroFicheLock = new Object();

    /**
     * ✅ Génère un numéro de consultation aléatoire unique
     * Format: NNNN/YYYY (ex: 4523/2026)
     * @deprecated Utilisez generateSequentialNumeroFiche() pour un numérotage séquentiel
     */
    @Deprecated
    private String generateFicheNumber() {
        int currentYear = Year.now().getValue();

        synchronized (ficheNumberLock) {
            String nextCode;
            int attempts = 0;
            final int maxAttempts = 100;

            do {
                // Utilise un random + timestamp pour éviter les collisions
                int random = (int) (Math.random() * 9000) + 1000; // 4 chiffres entre 1000-9999
                int sequence = (attempts + 1) % 10000;
                int combined = (random + sequence) % 10000;

                nextCode = String.format("%04d/%d", combined, currentYear);
                attempts++;

                if (attempts >= maxAttempts) {
                    throw new RuntimeException("Impossible de générer un numéro de fiche unique après " + maxAttempts + " tentatives");
                }
            } while (consultationRepository.findByConsultationCode(nextCode).isPresent());

            return nextCode;
        }
    }

    /**
     * ✅ Génère un numéro de fiche séquentiel immuable au format SEQ/ANNEE
     * Format: XXXX/YYYY (ex: 0001/2026)
     * Le numéro est incrémenté pour chaque consultation dans l'année
     */
    private String generateSequentialNumeroFiche() {
        int currentYear = Year.now().getValue();

        synchronized (numeroFicheLock) {
            // Récupérer le dernier numéro de fiche pour l'année courante
            String yearSuffix = "/" + currentYear;
            Optional<String> lastNumeroFiche = consultationRepository.findLastNumeroFicheByYear(yearSuffix);

            int nextSequence = 1; // Par défaut, commencer à 1

            if (lastNumeroFiche.isPresent()) {
                String lastNumero = lastNumeroFiche.get();
                // Extraire la partie séquence du format XXXX/YYYY
                try {
                    String[] parts = lastNumero.split("/");
                    if (parts.length == 2) {
                        int lastSequence = Integer.parseInt(parts[0]);
                        nextSequence = lastSequence + 1;
                    }
                } catch (NumberFormatException | ArrayIndexOutOfBoundsException e) {
                    log.warn("⚠️ Format de numeroFiche invalide: {}, utilisation de la séquence par défaut", lastNumero);
                    // Fallback: compter les consultations de l'année
                    Long count = consultationRepository.countByYear(currentYear);
                    nextSequence = count != null ? count.intValue() + 1 : 1;
                }
            }

            // Générer le nouveau numéro formaté
            String newNumeroFiche = String.format("%04d/%d", nextSequence, currentYear);

            // Vérifier l'unicité (sécurité supplémentaire)
            if (consultationRepository.findByNumeroFiche(newNumeroFiche).isPresent()) {
                log.error("❌ Collision détectée pour numeroFiche: {}", newNumeroFiche);
                throw new RuntimeException("Numéro de fiche déjà existant: " + newNumeroFiche);
            }

            log.info("✅ Numéro de fiche généré: {} pour l'année {}", newNumeroFiche, currentYear);
            return newNumeroFiche;
        }
    }

    @Override
    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public PageResponse<ConsultationDTO> getDoctorHistory(Long doctorId, Pageable pageable) {
        log.info("Récupération de l'historique filtré pour le docteur ID: {}", doctorId);

        List<ConsultationStatus> historyStatuses = List.of(
                COMPLETED,
                TERMINE,
                CANCELLED,
                ANNULE,
                ARCHIVED
        );

        Page<Consultation> page = consultationRepository.findByDoctorIdAndStatusInOrderByConsultationDateDesc(
                doctorId,
                historyStatuses,
                pageable
        );

        return toPageResponse(page);
    }

    @Override
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR')")
    public List<ConsultationDTO> getHistoryByPatientId(Long patientId) {
        log.info("Récupération de l'historique complet pour le patient ID: {}", patientId);
        return consultationRepository.findByPatientIdOrderByConsultationDateDesc(patientId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public List<ConsultationDTO> getDoctorAppointmentsByDate(Long doctorId, LocalDate date) {
        log.info("Récupération de l'agenda pour le docteur {} le {}", doctorId, date);
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

        return consultationRepository.findByDoctorIdAndConsultationDateBetween(doctorId, startOfDay, endOfDay)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTEUR', 'ROLE_RECEPTION', 'ROLE_ADMIN')")
    public ConsultationDTO archiveConsultation(Long id) {
        log.info("Archivage de la consultation ID: {}", id);
        Consultation consultation = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));

        consultation.setStatus(ARCHIVED);
        consultation.setUpdatedAt(LocalDateTime.now());

        return mapToDTO(consultationRepository.save(consultation));
    }

    @Override
    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    public List<ConsultationDTO> getConsultationsForCurrentPatient(String identifier) {
        User user = userRepository.findByEmailOrUsername(identifier, identifier)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        Patient patient = patientRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Profil patient inexistant"));

        return consultationRepository.findByPatientIdOrderByConsultationDateDesc(patient.getId())
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    public ConsultationDTO acceptReschedule(Long id) {
        Consultation consultation = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));

        if (consultation.getProposedNewDate() == null) {
            throw new IllegalStateException("Aucune nouvelle date n'a été proposée.");
        }

        consultation.setConsultationDate(consultation.getProposedNewDate());
        consultation.setStatus(CONFIRMED);
        consultation.setProposedNewDate(null);
        consultation.setUpdatedAt(LocalDateTime.now());

        Consultation saved = consultationRepository.save(consultation);

        try {
            notificationService.createAndSend(
                    saved.getDoctor(),
                    "Report Accepté",
                    "Le patient " + saved.getPatient().getFirstName() + " a accepté la nouvelle date.",
                    NotificationType.RENDEZ_VOUS,
                    saved.getId()
            );
        } catch (Exception e) {
            log.error("Erreur notification: {}", e.getMessage());
        }

        return mapToDTO(saved);
    }

    @Override
    @Transactional
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ConsultationDTO processDoctorDecision(Long id, DecisionRequest request) {
        Consultation consultation = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            try {
                String statusStr = request.getStatus().toUpperCase().trim().replace(" ", "_");
                consultation.setStatus(ConsultationStatus.valueOf(statusStr));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Statut invalide : " + request.getStatus());
            }
        }

        consultation.setDecisionNote(request.getDecisionNote());
        if (request.getProposedNewDate() != null) {
            consultation.setProposedNewDate(request.getProposedNewDate());
        }

        consultation.setUpdatedAt(LocalDateTime.now());
        Consultation updated = consultationRepository.save(consultation);

        try {
            if (updated.getPatient() != null && updated.getPatient().getUser() != null) {
                notificationService.createAndSend(
                        updated.getPatient().getUser(),
                        "Mise à jour de séance",
                        "Statut : " + updated.getStatus(),
                        NotificationType.RENDEZ_VOUS,
                        updated.getId()
                );
            }
        } catch (Exception e) {
            log.error(e.getMessage());
        }

        return mapToDTO(updated);
    }

    @Override
    @Transactional
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ConsultationDTO startConsultation(Long id) {
        Consultation consultation = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));

        if (consultation.getConsultationCode() == null || consultation.getConsultationCode().startsWith("RDV-")) {
            consultation.setConsultationCode(generateFicheNumber());
        }

        consultation.setStatus(EN_COURS);
        consultation.setUpdatedAt(LocalDateTime.now());
        return mapToDTO(consultationRepository.save(consultation));
    }

    @Override
    @Transactional
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    public ConsultationDTO createAppointmentForPatient(ConsultationDTO dto, String identifier) {
        User user = userRepository.findByEmailOrUsername(identifier, identifier)
                .orElseThrow(() -> new ResourceNotFoundException("Patient non identifié"));

        Patient patient = patientRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Profil patient inexistant"));

        User doctor = userRepository.findById(dto.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Docteur introuvable"));

        Consultation c = Consultation.builder()
                .consultationCode("RDV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .patient(patient)
                .doctor(doctor)
                .consultationDate(dto.getConsultationDate())
                .reasonForVisit(dto.getReasonForVisit())
                .status(EN_ATTENTE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Consultation saved = consultationRepository.save(c);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public ConsultationDTO getById(Long id) {
        EntityGraph<?> entityGraph = entityManager.createEntityGraph("consultation-with-patient-doctor-admission");

        Consultation consultation = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null) {
            String userRole = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .findFirst()
                    .orElse("ROLE_USER");

            String username = authentication.getName();

            if (userRole.equals("ROLE_DOCTEUR") && consultation.getDoctor() != null) {
                User doctor = userRepository.findByEmailOrUsername(username, username)
                        .orElseThrow(() -> new RuntimeException("Docteur non trouvé"));

                if (!consultation.getDoctor().getId().equals(doctor.getId())) {
                    throw new SecurityException("Vous n'êtes pas autorisé à accéder à cette consultation");
                }
            }
        }

        if (consultation.getPatient() != null) {
            consultation.getPatient().getFirstName();
        }
        if (consultation.getDoctor() != null) {
            consultation.getDoctor().getFirstName();
        }
        if (consultation.getAdmission() != null) {
            consultation.getAdmission().getPoids();
        }

        if (consultation.getAdmission() == null && consultation.getPatient() != null) {
            log.info("⚠️ Consultation {} sans admission, recherche de la dernière admission du patient {}...",
                    id, consultation.getPatient().getId());

            Optional<Admission> lastAdmissionOpt =
                    admissionRepository.findTopByPatientIdOrderByCreatedAtDesc(consultation.getPatient().getId());

            if (lastAdmissionOpt.isPresent()) {
                Admission lastAdmission = lastAdmissionOpt.get();
                consultation.setAdmission(lastAdmission);
                consultationRepository.save(consultation);
                log.info("✅ Admission {} liée à la consultation {}", lastAdmission.getId(), id);
            } else {
                log.info("⚠️ Aucune admission trouvée, création automatique...");
                Admission newAdmission = Admission.builder()
                        .patient(consultation.getPatient())
                        .doctor(consultation.getDoctor())
                        .admissionDate(consultation.getCreatedAt() != null ? consultation.getCreatedAt() : LocalDateTime.now())
                        .poids(consultation.getPoids())
                        .temperature(consultation.getTemperature())
                        .taille(consultation.getTaille())
                        .tensionArterielle(consultation.getTensionArterielle())
                        .reasonForVisit(consultation.getReasonForVisit())
                        .symptoms(consultation.getSymptoms())
                        .notes(consultation.getNotes())
                        .registrationFee(BigDecimal.valueOf(consultation.getFicheAmountDue() != null ? consultation.getFicheAmountDue() : 0.0))
                        .serviceFee(BigDecimal.valueOf(consultation.getConsulAmountDue() != null ? consultation.getConsulAmountDue() : 0.0))
                        .totalAmount(BigDecimal.valueOf(
                            (consultation.getFicheAmountDue() != null ? consultation.getFicheAmountDue() : 0.0) +
                            (consultation.getConsulAmountDue() != null ? consultation.getConsulAmountDue() : 0.0)
                        ))
                        .status(Admission.AdmissionStatus.EN_ATTENTE)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();

                Admission savedAdmission = admissionRepository.save(newAdmission);
                consultation.setAdmission(savedAdmission);
                consultationRepository.save(consultation);
                log.info("✅ Nouvelle admission {} creee pour la consultation {}", savedAdmission.getId(), id);
            }
        }

        return mapToDTO(consultation);
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR', 'ROLE_PATIENT')")
    public void delete(Long id) {
        log.info("Demande d'archivage (Soft Delete) pour la consultation ID: {}", id);
        Consultation consultation = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));

        consultation.setStatus(ARCHIVED);
        consultation.setUpdatedAt(LocalDateTime.now());
        consultationRepository.save(consultation);
        log.info("Consultation ID: {} marquée comme ARCHIVÉE.", id);
    }

    @Override
    @Transactional(readOnly = true)
    public ConsultationDTO mapToDTO(Consultation c) {
        if (c == null) {
            log.warn("[DEBUG] mapToDTO - Consultation est NULL !");
            return ConsultationDTO.builder().build();
        }

        ConsultationDTO dto = ConsultationDTO.builder()
                .id(c.getId())
                .consultationCode(c.getConsultationCode())
                .patientId(c.getPatient() != null ? c.getPatient().getId() : null)
                .status(c.getStatus())
                .statut(c.getStatut())
                .decisionNote(c.getDecisionNote())
                .proposedNewDate(c.getProposedNewDate())
                .consultationDate(c.getConsultationDate())
                .reasonForVisit(c.getReasonForVisit())
                .motif(getMotif(c))
                .diagnosis(c.getDiagnosis())
                .treatment(c.getTreatment())
                .poids(getVitalSign(c, "poids"))
                .temperature(getVitalSign(c, "temperature"))
                .taille(getVitalSign(c, "taille"))
                .tensionArterielle(getVitalSign(c, "tensionArterielle"))
                .fraisFiche(c.getFraisFiche())
                .serviceId(c.getService() != null ? c.getService().getId() : null)
                .serviceName(c.getService() != null ? c.getService().getNom() : null)
                .servicePrice(c.getService() != null ? c.getService().getPrix() : null)
                .ficheAmountDue(c.getFicheAmountDue())
                .ficheAmountPaid(c.getFicheAmountPaid())
                .examTotalAmount(c.getExamTotalAmount())
                .consulAmountDue(c.getConsulAmountDue())
                .consulAmountPaid(c.getConsulAmountPaid())
                .build();

        try {
            if (c.getServices() != null) {
                int serviceCount;
                try {
                    serviceCount = c.getServices().size();
                } catch (Exception e) {
                    serviceCount = 0;
                }

                if (serviceCount > 0) {
                    List<MedicalServiceDTO> serviceDTOs = c.getServices().stream()
                            .map(service -> MedicalServiceDTO.builder()
                                    .id(service.getId())
                                    .nom(service.getNom())
                                    .description(service.getDescription())
                                    .prix(service.getPrix())
                                    .departement(service.getDepartement())
                                    .duree(service.getDuree())
                                    .isActive(service.getIsActive())
                                    .build())
                            .collect(Collectors.toList());
                    dto.setServices(serviceDTOs);
                } else {
                    dto.setServices(List.of());
                }
            }
        } catch (Exception e) {
            dto.setServices(List.of());
        }

        // ★ Inclure les examens prescrits - fetch direct depuis repository (évite lazy loading)
        try {
            List<PrescribedExam> exams = prescribedExamRepository.findByConsultationIdAndActiveTrue(c.getId());
            if (exams != null && !exams.isEmpty()) {
                List<Map<String, Object>> examDTOs = exams.stream()
                    .map(exam -> {
                        Map<String, Object> examMap = new HashMap<>();
                        examMap.put("id", exam.getId());
                        examMap.put("serviceName", exam.getServiceName());
                        examMap.put("unitPrice", exam.getUnitPrice());
                        examMap.put("totalPrice", exam.getTotalPrice());
                        examMap.put("quantity", exam.getQuantity());
                        examMap.put("doctorNote", exam.getDoctorNote());
                        examMap.put("status", exam.getStatus() != null ? exam.getStatus().toString() : null);
                        examMap.put("unit", exam.getUnit());
                        examMap.put("referenceMin", exam.getReferenceMin());
                        examMap.put("referenceMax", exam.getReferenceMax());
                        return examMap;
                    })
                    .collect(Collectors.toList());
                dto.setPrescribedExams(examDTOs);
            } else {
                dto.setPrescribedExams(List.of());
            }
        } catch (Exception e) {
            dto.setPrescribedExams(List.of());
        }

        // ★ Inclure les prescriptions avec leurs items détaillés
        try {
            List<Prescription> prescriptions = prescriptionRepository.findAllByConsultationId(c.getId());
            if (prescriptions != null && !prescriptions.isEmpty()) {
                List<PrescriptionDTO> prescriptionDTOs = prescriptions.stream()
                    .map(p -> {
                        List<PrescriptionDTO.PrescriptionItemDTO> items = prescriptionItemRepository.findByPrescriptionId(p.getId())
                            .stream()
                            .map(item -> {
                                String durationStr = item.getDuration() != null ? item.getDuration().toString() : null;
                                Integer stockQuantity = item.getMedication() != null ? item.getMedication().getStockQuantity() : 0;
                                BigDecimal unitPrice = item.getMedication() != null ? item.getMedication().getUnitPrice() : BigDecimal.ZERO;
                                BigDecimal totalPrice = BigDecimal.ZERO;
                                if (unitPrice != null && item.getQuantity() != null) {
                                    totalPrice = unitPrice.multiply(BigDecimal.valueOf(item.getQuantity()));
                                }
                                return PrescriptionDTO.PrescriptionItemDTO.builder()
                                    .id(item.getId())
                                    .medicationId(item.getMedication() != null ? item.getMedication().getId() : null)
                                    .medicationName(item.getMedication() != null ? item.getMedication().getName() : null)
                                    .dosage(item.getDosage())
                                    .frequency(item.getFrequency())
                                    .timeSlots(item.getTimeSlots())
                                    .duration(durationStr)
                                    .quantity(item.getQuantity() != null ? item.getQuantity() : 0)
                                    .quantityPerDose(item.getQuantityPerDose())
                                    .instructions(item.getInstructions())
                                    .unitPrice(unitPrice != null ? unitPrice : BigDecimal.ZERO)
                                    .totalPrice(totalPrice)
                                    .stockQuantity(stockQuantity != null ? stockQuantity : 0)
                                    .build();
                            })
                            .collect(Collectors.toList());

                        return PrescriptionDTO.builder()
                            .id(p.getId())
                            .prescriptionCode(p.getPrescriptionCode())
                            .consultationId(c.getId())
                            .patientId(p.getPatient() != null ? p.getPatient().getId() : null)
                            .patientName(p.getPatient() != null ? p.getPatient().getFirstName() + " " + p.getPatient().getLastName() : null)
                            .doctorId(p.getDoctor() != null ? p.getDoctor().getId() : null)
                            .doctorName(p.getDoctor() != null ? p.getDoctor().getFirstName() + " " + p.getDoctor().getLastName() : null)
                            .notes(p.getNotes())
                            .status(p.getStatus())
                            .totalAmount(p.getTotalAmount())
                            .amountPaid(p.getAmountPaid())
                            .currency(p.getCurrency() != null ? p.getCurrency().name() : "USD")
                            .createdAt(p.getCreatedAt())
                            .items(items)
                            .build();
                    })
                    .collect(Collectors.toList());
                dto.setPrescriptions(prescriptionDTOs);
            } else {
                dto.setPrescriptions(List.of());
            }
        } catch (Exception e) {
            log.warn("Erreur chargement prescriptions pour consultation {}: {}", c.getId(), e.getMessage());
            dto.setPrescriptions(List.of());
        }

        if (c.getPatient() != null) {
            try {
                Patient p = c.getPatient();
                dto.setPatientName(p.getFirstName() + " " + p.getLastName());
                dto.setPhoneNumber(p.getPhoneNumber());
                dto.setGender(p.getGender() != null ? p.getGender().name() : null);
                dto.setProfession(p.getProfession());
                dto.setMaritalStatus(p.getMaritalStatus());
                dto.setBirthPlace(p.getBirthPlace());
                dto.setDateOfBirth(p.getDateOfBirth());
                dto.setReligion(p.getReligion());
                dto.setNationality(p.getNationality());
                dto.setPatientPhoto(
                        p.getPhotoUrl() != null && !p.getPhotoUrl().isEmpty()
                                ? normalizePhotoUrl(p.getPhotoUrl())
                                : "/uploads/default-patient.png"
                );
            } catch (Exception e) {
                dto.setPatientName("Patient Inconnu");
                dto.setPatientPhoto("/uploads/default-patient.png");
            }
        } else {
            dto.setPatientName("Patient Inconnu");
            dto.setPatientPhoto("/uploads/default-patient.png");
        }

        // --- Champs financiers depuis l'Admission ---
        if (c.getAdmission() != null) {
            Admission adm = c.getAdmission();
            dto.setAdmissionId(adm.getId());
            dto.setIsAbonne(adm.getIsAbonne());
            dto.setCompanyId(adm.getCompany() != null ? adm.getCompany().getId() : null);
            dto.setCompanyName(adm.getCompany() != null ? adm.getCompany().getName() : null);
            dto.setMatricule(adm.getMatricule());
            dto.setTotalAmount(adm.getTotalAmount());
            dto.setAmountPaid(adm.getAmountPaid());
            dto.setCompanyCoverage(adm.getCompanyCoverage());
            dto.setPatientSurplus(adm.getPatientSurplus());
            dto.setCoverageRate(adm.getCoverageRate());
            dto.setAdmissionStatus(adm.getStatus() != null ? adm.getStatus().name() : null);
        }

        if (c.getDoctor() != null) {
            try {
                dto.setDoctorId(c.getDoctor().getId());
                dto.setDoctorName(c.getDoctor().getFirstName() + " " + c.getDoctor().getLastName());

                if (c.getDoctor().getPhotoUrl() != null && !c.getDoctor().getPhotoUrl().isEmpty()) {
                    String photoUrl = c.getDoctor().getPhotoUrl();

                    if (photoUrl.contains("/uploads//uploads/")) {
                        photoUrl = photoUrl.replace("/uploads//uploads/", "/uploads/");
                    } else if (photoUrl.contains("/profiles//uploads/")) {
                        photoUrl = photoUrl.replace("/profiles//uploads/", "/uploads/");
                    } else if (photoUrl.contains("/uploads/profiles//uploads/")) {
                        photoUrl = photoUrl.replace("/uploads/profiles//uploads/", "/uploads/");
                    } else if (photoUrl.contains("profiles//uploads/")) {
                        photoUrl = photoUrl.replace("profiles//uploads/", "/uploads/");
                    } else if (photoUrl.startsWith("uploads/")) {
                        photoUrl = "/" + photoUrl;
                    } else if (photoUrl.startsWith("/profiles/")) {
                        photoUrl = photoUrl.replace("/profiles/", "/uploads/");
                    } else if (photoUrl.startsWith("profiles/")) {
                        photoUrl = "/uploads/" + photoUrl.substring(9);
                    } else if (!photoUrl.startsWith("/uploads/")) {
                        photoUrl = "/uploads/" + photoUrl;
                    }

                    dto.setDoctorPhoto(photoUrl);
                } else {
                    dto.setDoctorPhoto("/uploads/default-doctor.png");
                }

                if (c.getDoctor().getDepartment() != null) {
                    dto.setDepartmentName(c.getDoctor().getDepartment().getNom());
                }
            } catch (Exception e) {
                dto.setDoctorName("Docteur Inconnu");
                dto.setDoctorPhoto("/uploads/default-doctor.png");
            }
        } else {
            dto.setDoctorName("Docteur Inconnu");
            dto.setDoctorPhoto("/uploads/default-doctor.png");
        }

        return dto;
    }

    private String getVitalSign(Consultation c, String signName) {
        if (c.getAdmission() != null) {
            switch (signName) {
                case "poids":
                    if (c.getAdmission().getPoids() != null && !c.getAdmission().getPoids().isEmpty()) return c.getAdmission().getPoids();
                    break;
                case "temperature":
                    if (c.getAdmission().getTemperature() != null && !c.getAdmission().getTemperature().isEmpty()) return c.getAdmission().getTemperature();
                    break;
                case "taille":
                    if (c.getAdmission().getTaille() != null && !c.getAdmission().getTaille().isEmpty()) return c.getAdmission().getTaille();
                    break;
                case "tensionArterielle":
                    if (c.getAdmission().getTensionArterielle() != null && !c.getAdmission().getTensionArterielle().isEmpty()) return c.getAdmission().getTensionArterielle();
                    break;
            }
        }

        switch (signName) {
            case "poids": return c.getPoids();
            case "temperature": return c.getTemperature();
            case "taille": return c.getTaille();
            case "tensionArterielle": return c.getTensionArterielle();
            default: return null;
        }
    }

    private PageResponse<ConsultationDTO> toPageResponse(Page<Consultation> page) {
        return PageResponse.<ConsultationDTO>builder()
                .content(page.getContent().stream().map(this::mapToDTO).toList())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ConsultationDTO> getAll(Pageable pageable) {
        // 🏥 MULTI-TENANT : ne renvoyer que les consultations de l'hôpital courant.
        // hId == null => appelant sans hôpital (superadmin) => accès global conservé.
        Long hId = HospitalTenantContext.getHospitalId();
        org.springframework.data.domain.Page<com.hospital.backend.entity.Consultation> page =
                (hId != null)
                        ? consultationRepository.findByPatientHospitalId(hId, pageable)
                        : consultationRepository.findAll(pageable);
        return toPageResponse(page);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ConsultationDTO> getByStatus(ConsultationStatus status, Pageable pageable) {
        return toPageResponse(consultationRepository.findByStatus(status, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ConsultationDTO> getByPatient(Long patientId, Pageable pageable) {
        return toPageResponse(consultationRepository.findByPatientId(patientId, pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ConsultationDTO> getByDoctor(Long doctorId, Pageable pageable) {
        return toPageResponse(consultationRepository.findByDoctorId(doctorId, pageable));
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR')")
    public ConsultationDTO updateStatus(Long id, ConsultationStatus status) {
        Consultation c = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));
        c.setStatus(status);
        c.setUpdatedAt(LocalDateTime.now());
        return mapToDTO(consultationRepository.save(c));
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION')")
    public ConsultationDTO create(ConsultationDTO dto) {
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient introuvable"));

        User doctor = userRepository.findById(dto.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Docteur introuvable"));

        MedicalService service = null;
        if (dto.getServiceId() != null) {
            service = serviceRepository.findById(dto.getServiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Service introuvable"));
        }

        // ===================== ABONNÉ =====================
        boolean isAbonne = Boolean.TRUE.equals(dto.getIsAbonne());
        com.hospital.backend.entity.Company company = null;
        BigDecimal coverageRate = null;
        BigDecimal companyCoverage = BigDecimal.ZERO;
        BigDecimal patientSurplus = BigDecimal.ZERO;
        BigDecimal totalForConsumption = BigDecimal.ZERO;

        if (isAbonne) {
            if (dto.getCompanyId() == null) {
                throw new IllegalArgumentException("companyId est obligatoire pour un patient abonné");
            }
            company = companyRepository.findById(dto.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Entreprise introuvable: " + dto.getCompanyId()));
            if (company.getSubscriptionStatus() != com.hospital.backend.entity.SubscriptionStatus.ACTIVE) {
                throw new IllegalStateException(
                        "L'abonnement de l'entreprise " + company.getName() + " n'est pas ACTIF");
            }

            coverageRate = company.getCoverageRate() != null
                    ? company.getCoverageRate() : new BigDecimal("100.00");

            log.info("💳 Réception ABONNÉ - entreprise={}, matricule={}, coverage={}%",
                    company.getName(), dto.getMatricule(), coverageRate);
        }

        // Vérifier si le patient a une fiche active (payée dans les 12 derniers mois)
        boolean hasActiveFile = hasActiveFiche(patient.getId());

        // Récupérer le prix de la fiche depuis la config
        BigDecimal fichePrice = getFichePriceFromConfig();
        // ✅ La fiche est facturée pour tous (abonnés inclus) — la couverture entreprise s'en charge
        double ficheAmountDue = hasActiveFile ? 0.0 : fichePrice.doubleValue();
        double consulAmountDue = (isAbonne) ? 0.0 : (service != null ? service.getPrix() : 0.0);
        double totalAmount = ficheAmountDue + consulAmountDue;

        // Pour les abonnés, calculer le surplus/ticket modeste
        if (isAbonne) {
            BigDecimal ficheForAbonne = hasActiveFile ? BigDecimal.ZERO : fichePrice;
            double servicePrix = (service != null && service.getPrix() != null) ? service.getPrix() : 0.0;
            BigDecimal total = ficheForAbonne.add(BigDecimal.valueOf(servicePrix));
            totalForConsumption = total;
            if (total.compareTo(BigDecimal.ZERO) > 0 && coverageRate.compareTo(new BigDecimal("100")) < 0) {
                // Ticket modeste : le patient paie le reste
                companyCoverage = total.multiply(coverageRate)
                        .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                patientSurplus = total.subtract(companyCoverage);
                totalAmount = patientSurplus.doubleValue();
                log.info("💳 Ticket modeste - companyCoverage={}, patientSurplus={}", companyCoverage, patientSurplus);
            } else {
                // Couverture totale
                companyCoverage = total;
                patientSurplus = BigDecimal.ZERO;
                totalAmount = 0.0;
                log.info("💳 Couverture 100% - totalAmount=0");
            }
        }

        log.info("👤 Patient {} - Fiche active: {} - Montant fiche: {} - Abonné: {} - TotalAmount: {}",
            patient.getId(), hasActiveFile, ficheAmountDue, isAbonne, totalAmount);

        Admission newAdmission = Admission.builder()
                .patient(patient)
                .doctor(doctor)
                .admissionDate(LocalDateTime.now())
                .poids(dto.getPoids())
                .temperature(dto.getTemperature())
                .taille(dto.getTaille())
                .tensionArterielle(dto.getTensionArterielle())
                .reasonForVisit(dto.getReasonForVisit())
                .symptoms(dto.getSymptoms())
                .notes(dto.getNotes())
                .registrationFee(BigDecimal.valueOf(ficheAmountDue))
                .serviceFee(BigDecimal.valueOf(consulAmountDue))
                .totalAmount(BigDecimal.valueOf(totalAmount))
                .amountPaid(BigDecimal.ZERO)
                // Abonné : totalAmount=0 (ou surplus), filtre caisse (paid<total) l'exclut automatiquement
                .status(Admission.AdmissionStatus.EN_ATTENTE)
                .isAbonne(isAbonne)
                .company(company)
                .matricule(isAbonne ? dto.getMatricule() : null)
                .coverageRate(coverageRate)
                .companyCoverage(companyCoverage)
                .patientSurplus(patientSurplus)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Admission savedAdmission = admissionRepository.save(newAdmission);

        Consultation c = Consultation.builder()
                .consultationCode(generateFicheNumber())
                .patient(patient)
                .doctor(doctor)
                .service(service)
                .admission(savedAdmission)
                .consultationDate(LocalDateTime.now())
                .reasonForVisit(dto.getReasonForVisit())
                .poids(dto.getPoids())
                .temperature(dto.getTemperature())
                .taille(dto.getTaille())
                .tensionArterielle(dto.getTensionArterielle())
                .fraisFiche(dto.getFraisFiche())
                .ficheAmountDue(ficheAmountDue)
                .ficheAmountPaid(dto.getFicheAmountPaid() != null ? dto.getFicheAmountPaid() : 0.0)
                .consulAmountDue(consulAmountDue)
                .consulAmountPaid(dto.getConsulAmountPaid() != null ? dto.getConsulAmountPaid() : 0.0)
                .status(ARRIVED)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Consultation saved = consultationRepository.save(c);

        // Enregistrer la consommation après le flux CONSULTATION pour les abonnés
        if (isAbonne && company != null) {
            consumptionService.record(
                    company, patient, savedAdmission,
                    com.hospital.backend.entity.CompanyConsumptionRecord.FluxType.CONSULTATION,
                    service != null ? service.getNom() : dto.getReasonForVisit(),
                    totalForConsumption, coverageRate);
        }

        return mapToDTO(saved);
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION')")
    public ConsultationDTO linkOrCreateAdmission(Long consultationId, AdmissionDTO admissionDTO) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));

        if (consultation.getAdmission() != null) {
            return mapToDTO(consultation);
        }

        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        Admission existingAdmission = admissionRepository.findByPatientId(consultation.getPatient().getId())
                .stream()
                .filter(a -> a.getAdmissionDate() != null &&
                        a.getAdmissionDate().isAfter(startOfDay) &&
                        a.getAdmissionDate().isBefore(endOfDay))
                .findFirst()
                .orElse(null);

        if (existingAdmission != null) {
            consultation.setAdmission(existingAdmission);
        } else {
            Admission newAdmission = Admission.builder()
                    .patient(consultation.getPatient())
                    .doctor(consultation.getDoctor())
                    .admissionDate(consultation.getCreatedAt() != null ? consultation.getCreatedAt() : LocalDateTime.now())
                    .poids(admissionDTO != null ? admissionDTO.getPoids() : consultation.getPoids())
                    .temperature(admissionDTO != null ? admissionDTO.getTemperature() : consultation.getTemperature())
                    .taille(admissionDTO != null ? admissionDTO.getTaille() : consultation.getTaille())
                    .tensionArterielle(admissionDTO != null ? admissionDTO.getTensionArterielle() : consultation.getTensionArterielle())
                    .reasonForVisit(admissionDTO != null ? admissionDTO.getReasonForVisit() : consultation.getReasonForVisit())
                    .symptoms(admissionDTO != null ? admissionDTO.getSymptoms() : consultation.getSymptoms())
                    .notes(admissionDTO != null ? admissionDTO.getNotes() : consultation.getNotes())
                    .status(Admission.AdmissionStatus.EN_ATTENTE)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            Admission savedAdmission = admissionRepository.save(newAdmission);
            consultation.setAdmission(savedAdmission);
        }

        return mapToDTO(consultationRepository.save(consultation));
    }

    @Transactional
    public void migrateConsultationsWithoutAdmission() {
        List<Consultation> consultationsWithoutAdmission = consultationRepository.findAll().stream()
                .filter(c -> c.getAdmission() == null)
                .collect(Collectors.toList());

        for (Consultation consultation : consultationsWithoutAdmission) {
            try {
                Admission newAdmission = Admission.builder()
                        .patient(consultation.getPatient())
                        .doctor(consultation.getDoctor())
                        .admissionDate(consultation.getCreatedAt() != null ? consultation.getCreatedAt() : LocalDateTime.now())
                        .poids(consultation.getPoids())
                        .temperature(consultation.getTemperature())
                        .taille(consultation.getTaille())
                        .tensionArterielle(consultation.getTensionArterielle())
                        .reasonForVisit(consultation.getReasonForVisit())
                        .symptoms(consultation.getSymptoms())
                        .notes(consultation.getNotes())
                        .registrationFee(BigDecimal.valueOf(consultation.getFicheAmountDue() != null ? consultation.getFicheAmountDue() : 0.0))
                        .serviceFee(BigDecimal.valueOf(consultation.getConsulAmountDue() != null ? consultation.getConsulAmountDue() : 0.0))
                        .totalAmount(BigDecimal.valueOf(
                            (consultation.getFicheAmountDue() != null ? consultation.getFicheAmountDue() : 0.0) +
                            (consultation.getConsulAmountDue() != null ? consultation.getConsulAmountDue() : 0.0)
                        ))
                        .status(Admission.AdmissionStatus.EN_ATTENTE)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();

                Admission savedAdmission = admissionRepository.save(newAdmission);
                consultation.setAdmission(savedAdmission);
                consultationRepository.save(consultation);
            } catch (Exception e) {
                log.error("Erreur migration consultation {}: {}", consultation.getId(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION')")
    public ConsultationDTO update(Long id, ConsultationDTO dto) {
        Consultation c = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));

        String currentUserRole = getCurrentUserRole();

        if ("ROLE_DOCTEUR".equals(currentUserRole)) {
            c.setDiagnosis(dto.getDiagnosis());
            c.setTreatment(dto.getTreatment());
            c.setNotes(dto.getNotes());
            c.setSymptoms(dto.getSymptoms());
        } else if ("ROLE_RECEPTION".equals(currentUserRole)) {
            c.setPoids(dto.getPoids());
            c.setTemperature(dto.getTemperature());
            c.setTaille(dto.getTaille());
            c.setTensionArterielle(dto.getTensionArterielle());
            c.setReasonForVisit(dto.getReasonForVisit());
        } else {
            c.setDiagnosis(dto.getDiagnosis());
            c.setTreatment(dto.getTreatment());
            c.setNotes(dto.getNotes());
            c.setSymptoms(dto.getSymptoms());
            c.setPoids(dto.getPoids());
            c.setTemperature(dto.getTemperature());
            c.setTaille(dto.getTaille());
            c.setTensionArterielle(dto.getTensionArterielle());
            c.setReasonForVisit(dto.getReasonForVisit());
        }

        if (dto.getExams() != null && ("ROLE_DOCTEUR".equals(currentUserRole) || "ROLE_RECEPTION".equals(currentUserRole))) {
            for (ExamItemDTO exam : dto.getExams()) {
                if (exam.getServiceId() != null) {
                    serviceRepository.findById(exam.getServiceId())
                            .orElseThrow(() -> new IllegalArgumentException("Service ID " + exam.getServiceId() + " introuvable"));
                }
            }

            c.setExams(dto.getExams().stream()
                    .map(e -> new ExamItem(e.getServiceId(), e.getNote()))
                    .collect(Collectors.toList()));
        }

        if (dto.getExamAmountPaid() != null) {
            c.setExamAmountPaid(dto.getExamAmountPaid());
        }

        if (dto.getStatus() != null) {
            c.setStatus(dto.getStatus());
        }

        c.setUpdatedAt(LocalDateTime.now());
        return mapToDTO(consultationRepository.save(c));
    }

    private String getCurrentUserRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && !authentication.getAuthorities().isEmpty()) {
            GrantedAuthority authority = authentication.getAuthorities().iterator().next();
            return authority.getAuthority();
        }
        return "UNKNOWN";
    }

    @Override
    @Transactional(readOnly = true)
    public ConsultationDTO getByCode(String code) {
        return consultationRepository.findByConsultationCode(code)
                .map(this::mapToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Code consultation introuvable"));
    }

    @Override
    @Transactional
    public ConsultationDTO sendToLab(Long id) {
        Consultation c = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));

        c.setStatus(AU_LABO);
        c.setUpdatedAt(LocalDateTime.now());

        List<PrescribedExam> exams = prescribedExamRepository.findByConsultationIdAndActiveTrue(id);
        for (PrescribedExam exam : exams) {
            exam.setStatus(PrescribedExamStatus.PAID_PENDING_LAB);
        }
        prescribedExamRepository.saveAll(exams);

        return mapToDTO(consultationRepository.save(c));
    }

    @Override
    @Transactional
    public ConsultationDTO sendToPharmacy(Long id) {
        Consultation c = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));
        c.setStatus(PHARMACIE_EN_ATTENTE);
        c.setUpdatedAt(LocalDateTime.now());
        return mapToDTO(consultationRepository.save(c));
    }

    private String getMotif(Consultation c) {
        try {
            if (c.getAdmission() != null &&
                    c.getAdmission().getReasonForVisit() != null &&
                    !c.getAdmission().getReasonForVisit().trim().isEmpty()) {
                return c.getAdmission().getReasonForVisit();
            }
        } catch (Exception e) {
            log.warn("[DEBUG] Erreur accès admission dans getMotif: {}", e.getMessage());
        }

        if (c.getReasonForVisit() != null && !c.getReasonForVisit().trim().isEmpty()) {
            return c.getReasonForVisit();
        }

        return "Consultation Standard";
    }

    private String normalizePhotoUrl(String photoUrl) {
        if (photoUrl == null || photoUrl.trim().isEmpty()) {
            return "/uploads/default-patient.png";
        }

        photoUrl = photoUrl.trim();

        if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
            return photoUrl;
        }

        if (photoUrl.contains("/uploads//uploads/")) {
            photoUrl = photoUrl.replace("/uploads//uploads/", "/uploads/");
        }
        if (photoUrl.contains("/profiles//uploads/")) {
            photoUrl = photoUrl.replace("/profiles//uploads/", "/uploads/");
        }
        if (photoUrl.contains("profiles//uploads/")) {
            photoUrl = photoUrl.replace("profiles//uploads/", "/uploads/");
        }

        if (photoUrl.startsWith("/uploads/")) {
            return photoUrl;
        }
        if (photoUrl.startsWith("uploads/")) {
            return "/" + photoUrl;
        }
        if (photoUrl.startsWith("/profiles/")) {
            return photoUrl.replace("/profiles/", "/uploads/");
        }
        if (photoUrl.startsWith("profiles/")) {
            return "/uploads/" + photoUrl.substring(9);
        }

        return "/uploads/" + photoUrl;
    }

    @Override
    @Transactional
    public ConsultationDTO updateConsultation(Long id, ConsultationDTO consultationDTO) {
        Consultation consultation = consultationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée avec l'ID: " + id));

        if (consultationDTO.getDiagnosis() != null) consultation.setDiagnosis(consultationDTO.getDiagnosis());
        if (consultationDTO.getTreatment() != null) consultation.setTreatment(consultationDTO.getTreatment());
        if (consultationDTO.getNotes() != null) consultation.setNotes(consultationDTO.getNotes());
        if (consultationDTO.getSymptoms() != null) consultation.setSymptoms(consultationDTO.getSymptoms());
        if (consultationDTO.getReasonForVisit() != null) consultation.setReasonForVisit(consultationDTO.getReasonForVisit());
        if (consultationDTO.getPoids() != null) consultation.setPoids(consultationDTO.getPoids());
        if (consultationDTO.getTemperature() != null) consultation.setTemperature(consultationDTO.getTemperature());
        if (consultationDTO.getTaille() != null) consultation.setTaille(consultationDTO.getTaille());
        if (consultationDTO.getTensionArterielle() != null) consultation.setTensionArterielle(consultationDTO.getTensionArterielle());
        if (consultationDTO.getStatus() != null) consultation.setStatus(consultationDTO.getStatus());
        if (consultationDTO.getFraisFiche() != null) consultation.setFraisFiche(consultationDTO.getFraisFiche());
        if (consultationDTO.getFicheAmountDue() != null) consultation.setFicheAmountDue(consultationDTO.getFicheAmountDue());
        if (consultationDTO.getFicheAmountPaid() != null) consultation.setFicheAmountPaid(consultationDTO.getFicheAmountPaid());
        if (consultationDTO.getConsulAmountDue() != null) consultation.setConsulAmountDue(consultationDTO.getConsulAmountDue());
        if (consultationDTO.getConsulAmountPaid() != null) consultation.setConsulAmountPaid(consultationDTO.getConsulAmountPaid());

        // ✅ SYNCHRONISATION: Quand examAmountPaid est mis à jour, synchroniser ficheAmountPaid
        // pour que l'affichage frontend (basé sur ficheAmountPaid) soit correct
        if (consultationDTO.getExamAmountPaid() != null) {
            consultation.setExamAmountPaid(consultationDTO.getExamAmountPaid());
            // Si ficheAmountDue existe, on considère que ce paiement couvre aussi la fiche
            if (consultation.getFicheAmountDue() != null && consultation.getFicheAmountDue() > 0) {
                consultation.setFicheAmountPaid(consultation.getFicheAmountDue());
                log.info("💰 [UPDATE] ficheAmountPaid synchronisé avec ficheAmountDue: {}", consultation.getFicheAmountDue());
            }
        }

        consultation.setUpdatedAt(LocalDateTime.now());

        Consultation savedConsultation = consultationRepository.save(consultation);
        return mapToDTO(savedConsultation);
    }

    @Override
    @Transactional
    public ConsultationDTO createPrescription(Long consultationId, List<Long> serviceIds, List<String> doctorNotes) {
        log.info("🔄 [PRESCRIPTION] Création de prescription pour consultation ID: {}", consultationId);

        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée: " + consultationId));

        List<PrescribedExam> existingExams = prescribedExamRepository.findByConsultationId(consultationId);
        if (!existingExams.isEmpty()) {
            prescribedExamRepository.deleteAll(existingExams);
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<PrescribedExam> newExams = new ArrayList<>();

        for (int i = 0; i < serviceIds.size(); i++) {
            Long serviceId = serviceIds.get(i);
            String doctorNote = (doctorNotes != null && i < doctorNotes.size()) ? doctorNotes.get(i) : null;

            MedicalService service = serviceRepository.findById(serviceId)
                    .orElseThrow(() -> new RuntimeException("Service non trouvé: " + serviceId));

            BigDecimal unitPrice = BigDecimal.valueOf(service.getPrix());

            // Récupérer l'examen lié pour les valeurs de référence
            Examen examenLie = examenRepository.findByServiceId(service.getId()).orElse(null);
            String refMin = null;
            String refMax = null;
            String refRangeText = null;
            String unit = null;
            if (examenLie != null) {
                refMin = examenLie.getValeurMinReference() != null ? examenLie.getValeurMinReference().toString() : null;
                refMax = examenLie.getValeurMaxReference() != null ? examenLie.getValeurMaxReference().toString() : null;
                unit = examenLie.getUnite();
                if (refMin != null && refMax != null) {
                    refRangeText = examenLie.getValeursReferenceFormatees();
                }
            }

            PrescribedExam prescribedExam = PrescribedExam.builder()
                    .consultation(consultation)
                    .service(service)
                    .serviceName(service.getNom())
                    .unitPrice(unitPrice)
                    .quantity(1)
                    .totalPrice(unitPrice)
                    .doctorNote(doctorNote)
                    .active(true)
                    .status(PrescribedExamStatus.PRESCRIBED)
                    .currency(service.getCurrency() != null ? service.getCurrency() : Currency.USD) // ✅ COPIE de la devise du service
                    .examen(examenLie)
                    .referenceMin(refMin)
                    .referenceMax(refMax)
                    .referenceRangeText(refRangeText)
                    .unit(unit)
                    .build();

            newExams.add(prescribedExam);
            totalAmount = totalAmount.add(unitPrice);
        }

        prescribedExamRepository.saveAll(newExams);

        consultation.setRequiresLabTest(true);
        consultation.setPrescribedExams(newExams);
        consultation.setExamTotalAmount(totalAmount);
        consultation.setExamAmountPaid(BigDecimal.ZERO);
        consultation.setStatus(ConsultationStatus.EXAMENS_PRESCRITS);
        consultation.setStatut("EXAMENS_PRESCRITS");
        consultation.setUpdatedAt(LocalDateTime.now());

        consultationRepository.save(consultation);

        // 🔔 Notifier le laboratoire des nouveaux examens prescrits
        try {
            List<String> examNames = newExams.stream()
                    .map(PrescribedExam::getServiceName)
                    .collect(Collectors.toList());
            String doctorName = consultation.getDoctor() != null
                    ? consultation.getDoctor().getFirstName() + " " + consultation.getDoctor().getLastName()
                    : "Docteur";
            String patientName = consultation.getPatient() != null
                    ? consultation.getPatient().getFirstName() + " " + consultation.getPatient().getLastName()
                    : "Patient";
            labAlertService.notifyExamsPrescribed(doctorName, patientName, examNames, consultationId);
            log.info("🔔 Notification labo envoyée - Examens: {}", examNames);
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi de la notification labo: {}", e.getMessage(), e);
        }

        return mapToDTO(consultation);
    }

    @Override
    public BigDecimal calculatePrescriptionTotal(Long consultationId) {
        BigDecimal total = prescribedExamRepository.calculateTotalAmountByConsultation(consultationId);
        return total != null ? total : BigDecimal.ZERO;
    }

    @Override
    @Transactional
    public ConsultationDTO updatePaymentStatus(Long consultationId, BigDecimal amountPaid) {
        log.info("💰 [CAISSE] Paiement consultation ID: {} - Montant: {}", consultationId, amountPaid);

        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée: " + consultationId));

        BigDecimal totalAmount = calculatePrescriptionTotal(consultationId);
        BigDecimal paid = amountPaid != null ? amountPaid : BigDecimal.ZERO;

        consultation.setExamTotalAmount(totalAmount);
        consultation.setExamAmountPaid(paid);

        // ✅ METTRE À JOUR ficheAmountPaid pour synchroniser avec l'affichage frontend
        // Si ficheAmountDue existe, on considère que ce paiement couvre la fiche
        if (consultation.getFicheAmountDue() != null && consultation.getFicheAmountDue() > 0) {
            consultation.setFicheAmountPaid(consultation.getFicheAmountDue());
            log.info("💰 [CAISSE] ficheAmountPaid mis à jour: {}", consultation.getFicheAmountDue());
        }

        List<PrescribedExam> exams = prescribedExamRepository.findByConsultationIdAndActiveTrue(consultationId);

        if (paid.compareTo(totalAmount) >= 0) {
            for (PrescribedExam exam : exams) {
                exam.setStatus(PrescribedExamStatus.PAID);
            }
            prescribedExamRepository.saveAll(exams);

            consultation.setStatus(ConsultationStatus.EXAMENS_PAYES);
            consultation.setStatut("EXAMENS_PAYES");

            // Enregistrer la consommation LABO pour les patients abonnés
            Admission adm = consultation.getAdmission();
            if (adm != null && Boolean.TRUE.equals(adm.getIsAbonne()) && adm.getCompany() != null) {
                try {
                    String labDesc = "Examens labo (" + exams.size() + " exam" + (exams.size() > 1 ? "s" : "") + ")";
                    consumptionService.record(
                            adm.getCompany(),
                            adm.getPatient(),
                            adm,
                            com.hospital.backend.entity.CompanyConsumptionRecord.FluxType.LABO,
                            labDesc,
                            totalAmount,
                            adm.getCoverageRate());
                } catch (Exception e) {
                    log.error("❌ Erreur enregistrement consommation LABO: {}", e.getMessage());
                }
            }
        } else {
            consultation.setStatus(ConsultationStatus.EXAMENS_PRESCRITS);
            consultation.setStatut("EXAMENS_PRESCRITS");
        }

        consultation.setUpdatedAt(LocalDateTime.now());
        consultationRepository.save(consultation);

        return mapToDTO(consultation);
    }

    @Override
    public List<com.hospital.backend.dto.PendingPaymentDTO> getPendingPayments() {
        Long hId = HospitalTenantContext.getHospitalId();
        List<Consultation> pendingConsultations = (hId != null)
                ? consultationRepository.findByStatusAndHospitalId(ConsultationStatus.EXAMENS_PRESCRITS, hId)
                : consultationRepository.findByStatus(ConsultationStatus.EXAMENS_PRESCRITS);

        return pendingConsultations.stream()
                .map(this::mapToPendingPaymentDTO)
                .collect(Collectors.toList());
    }

    private com.hospital.backend.dto.PendingPaymentDTO mapToPendingPaymentDTO(Consultation consultation) {
        List<PrescribedExam> prescribedExams = prescribedExamRepository
                .findByConsultationIdAndActiveTrueOrderByCreatedAtDesc(consultation.getId());

        BigDecimal totalAmount = consultation.getExamTotalAmount() != null &&
                consultation.getExamTotalAmount().compareTo(BigDecimal.ZERO) > 0
                ? consultation.getExamTotalAmount()
                : calculatePrescriptionTotal(consultation.getId());

        BigDecimal amountPaid = consultation.getExamAmountPaid() != null
                ? consultation.getExamAmountPaid()
                : BigDecimal.ZERO;

        BigDecimal remainingAmount = totalAmount.subtract(amountPaid);
        if (remainingAmount.compareTo(BigDecimal.ZERO) < 0) {
            remainingAmount = BigDecimal.ZERO;
        }

        List<com.hospital.backend.dto.PendingPaymentDTO.PrescribedExamDTO> examDTOs = prescribedExams.stream()
                .map(exam -> com.hospital.backend.dto.PendingPaymentDTO.PrescribedExamDTO.builder()
                        .id(exam.getId())
                        .serviceId(exam.getService().getId())
                        .serviceName(exam.getServiceName())
                        .unitPrice(exam.getUnitPrice())
                        .doctorNote(exam.getDoctorNote())
                        .status(exam.getStatus().name())
                        .currency(exam.getCurrency())  // ✅ Mapper la devise
                        .build())
                .collect(Collectors.toList());

        return com.hospital.backend.dto.PendingPaymentDTO.builder()
                .consultationId(consultation.getId())
                .consultationCode(consultation.getConsultationCode())
                .patientId(consultation.getPatient().getId())
                .patientName(consultation.getPatient().getFirstName() + " " + consultation.getPatient().getLastName())
                .patientCode(consultation.getPatient().getPatientCode())
                .patientPhone(consultation.getPatient().getPhoneNumber())
                .patientPhoto(normalizePhotoUrl(consultation.getPatient().getPhotoUrl()))
                .doctorId(consultation.getDoctor().getId())
                .doctorName(consultation.getDoctor().getFirstName() + " " + consultation.getDoctor().getLastName())
                .examTotalAmount(totalAmount)
                .examAmountPaid(amountPaid)
                .remainingAmount(remainingAmount)
                .prescribedExams(examDTOs)
                .status(consultation.getStatus().name())
                .createdAt(consultation.getCreatedAt())
                .updatedAt(consultation.getUpdatedAt())
                .build();
    }

    @Override
    public List<com.hospital.backend.dto.ReceptionPaymentDTO> getReceptionPendingPayments() {
        Long hId = HospitalTenantContext.getHospitalId();
        List<Consultation> pendingConsultations = (hId != null)
                ? consultationRepository.findByStatusAndHospitalId(ConsultationStatus.EXAMENS_PRESCRITS, hId)
                : consultationRepository.findByStatus(ConsultationStatus.EXAMENS_PRESCRITS);

        return pendingConsultations.stream()
                .map(this::mapToReceptionPaymentDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<com.hospital.backend.dto.TodayProcessedDTO> getTodayProcessedConsultations() {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);

        Long hId = HospitalTenantContext.getHospitalId();
        List<Consultation> processedConsultations = (hId != null)
                ? consultationRepository.findByStatusInAndUpdatedAtBetweenAndHospitalId(
                        List.of(ConsultationStatus.AU_LABO, ConsultationStatus.TERMINE, ConsultationStatus.COMPLETED),
                        startOfDay, endOfDay, hId)
                : consultationRepository.findByStatusInAndUpdatedAtBetween(
                        List.of(ConsultationStatus.AU_LABO, ConsultationStatus.TERMINE, ConsultationStatus.COMPLETED),
                        startOfDay, endOfDay);

        return processedConsultations.stream()
                .map(this::mapToTodayProcessedDTO)
                .collect(Collectors.toList());
    }

    @Override
    public com.hospital.backend.dto.ReceptionStatsDTO getReceptionStats() {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);

        Long hId = HospitalTenantContext.getHospitalId();
        List<Consultation> pendingConsultations = (hId != null)
                ? consultationRepository.findByStatusAndHospitalId(ConsultationStatus.EXAMENS_PRESCRITS, hId)
                : consultationRepository.findByStatus(ConsultationStatus.EXAMENS_PRESCRITS);

        List<Consultation> processedConsultations = (hId != null)
                ? consultationRepository.findByStatusInAndUpdatedAtBetweenAndHospitalId(
                        List.of(ConsultationStatus.AU_LABO, ConsultationStatus.TERMINE, ConsultationStatus.COMPLETED),
                        startOfDay, endOfDay, hId)
                : consultationRepository.findByStatusInAndUpdatedAtBetween(
                        List.of(ConsultationStatus.AU_LABO, ConsultationStatus.TERMINE, ConsultationStatus.COMPLETED),
                        startOfDay, endOfDay);

        Double totalPendingAmount = pendingConsultations.stream()
                .mapToDouble(c -> {
                    BigDecimal total = calculatePrescriptionTotal(c.getId());
                    return total != null ? total.doubleValue() : 0.0;
                })
                .sum();

        Double todayRevenue = processedConsultations.stream()
                .mapToDouble(c -> {
                    BigDecimal examAmount = c.getExamAmountPaid();
                    return examAmount != null ? examAmount.doubleValue() : 0.0;
                })
                .sum();

        return com.hospital.backend.dto.ReceptionStatsDTO.builder()
                .totalPending(pendingConsultations.size())
                .totalAmount(totalPendingAmount)
                .todayProcessed(processedConsultations.size())
                .todayRevenue(todayRevenue)
                .build();
    }

    @Override
    @Transactional
    public ConsultationDTO updateExamPaymentAndSendToLab(Long consultationId, Double examAmountPaid, String paymentMethodStr) {
        log.info("💰 [CAISSE] Paiement + envoi labo consultation ID: {} - Montant: {}",
                consultationId, examAmountPaid);

        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée: " + consultationId));

        BigDecimal paidAmount = examAmountPaid != null ? BigDecimal.valueOf(examAmountPaid) : BigDecimal.ZERO;
        BigDecimal totalAmount = calculatePrescriptionTotal(consultationId);

        // ── ABONNÉ : appliquer couverture (ticket modeste) ───────────────────────
        Admission admission = consultation.getAdmission();
        BigDecimal companyCoverage = BigDecimal.ZERO;
        BigDecimal patientSurplus = totalAmount;
        BigDecimal amountDue = totalAmount;

        if (admission != null && Boolean.TRUE.equals(admission.getIsAbonne()) && admission.getCompany() != null) {
            BigDecimal coverageRate = admission.getCoverageRate() != null
                    ? admission.getCoverageRate() : new BigDecimal("100.00");

            if (coverageRate.compareTo(new BigDecimal("100")) < 0) {
                // Ticket modeste : le patient paie le reste
                companyCoverage = totalAmount.multiply(coverageRate)
                        .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                patientSurplus = totalAmount.subtract(companyCoverage);
                amountDue = patientSurplus;
                log.info("💳 [CAISSE LABO] Abonné - total={}, coverage={}%, companyCoverage={}, patientSurplus={}",
                        totalAmount, coverageRate, companyCoverage, patientSurplus);
            } else {
                // Couverture totale
                companyCoverage = totalAmount;
                patientSurplus = BigDecimal.ZERO;
                amountDue = BigDecimal.ZERO;
                log.info("💳 [CAISSE LABO] Abonné - couverture 100% - amountDue=0");
            }
        } else {
            log.info("💳 [CAISSE LABO] Patient ordinaire - amountDue={}", amountDue);
        }

        consultation.setExamTotalAmount(totalAmount);
        consultation.setExamAmountPaid(paidAmount);

        if (paidAmount.compareTo(amountDue) < 0) {
            throw new RuntimeException("Paiement insuffisant. Requis: " + amountDue + ", Payé: " + paidAmount);
        }

        List<PrescribedExam> exams = prescribedExamRepository.findByConsultationIdAndActiveTrue(consultationId);

        for (PrescribedExam exam : exams) {
            exam.setStatus(PrescribedExamStatus.PAID_PENDING_LAB);
        }
        prescribedExamRepository.saveAll(exams);

        consultation.setStatus(ConsultationStatus.AU_LABO);
        consultation.setStatut("AU_LABO");
        consultation.setUpdatedAt(LocalDateTime.now());

        Consultation savedConsultation = consultationRepository.save(consultation);

        // ── Enregistrer la consommation LABO pour les abonnés ───────────────────────
        if (admission != null && Boolean.TRUE.equals(admission.getIsAbonne()) && admission.getCompany() != null) {
            try {
                String labDesc = "Examens labo (" + exams.size() + " exam" + (exams.size() > 1 ? "s" : "") + ")";
                consumptionService.record(
                        admission.getCompany(),
                        admission.getPatient(),
                        admission,
                        com.hospital.backend.entity.CompanyConsumptionRecord.FluxType.LABO,
                        labDesc,
                        totalAmount,
                        admission.getCoverageRate());
                log.info("💳 [CAISSE LABO] Consommation LABO enregistrée - total={}, coverage={}",
                        totalAmount, admission.getCoverageRate());
            } catch (Exception e) {
                log.error("❌ [CAISSE LABO] Erreur enregistrement consommation LABO: {}", e.getMessage());
            }
        }

        // 💰 Créer un revenu avec la source LABORATOIRE
        try {
            Long userId = getCurrentUserId();
            // Détecter la devise depuis les examens prescrits
            Currency examCurrency = exams.stream()
                .map(PrescribedExam::getCurrency)
                .filter(c -> c != null)
                .findFirst()
                .orElse(Currency.USD);
            createLabRevenue(savedConsultation, paidAmount, paymentMethodStr, examCurrency, userId);
            log.info("💰 [CAISSE] Revenu LABORATOIRE créé pour consultation ID: {} en {}", consultationId, examCurrency);
        } catch (Exception e) {
            log.error("❌ [CAISSE] Erreur lors de la création du revenu LABORATOIRE: {}", e.getMessage(), e);
            // Ne pas bloquer le processus si la création de revenu échoue
        }

        return mapToDTO(savedConsultation);
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_FINANCE')")
    public ConsultationDTO sendExamsToLabForSubscriber(Long consultationId) {
        log.info("🏥 [LABO] Envoi direct examens pour abonné couverture 100% - consultation ID: {}", consultationId);

        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée: " + consultationId));

        // Vérifier que c'est un abonné avec couverture 100%
        Admission admission = consultation.getAdmission();
        if (admission == null || !Boolean.TRUE.equals(admission.getIsAbonne()) || admission.getCompany() == null) {
            throw new RuntimeException("Cette consultation n'est pas pour un patient abonné");
        }

        BigDecimal coverageRate = admission.getCoverageRate() != null
                ? admission.getCoverageRate() : new BigDecimal("100.00");

        if (coverageRate.compareTo(new BigDecimal("100")) < 0) {
            throw new RuntimeException("Ce patient abonné n'a pas une couverture à 100%. Taux: " + coverageRate + "%");
        }

        BigDecimal totalAmount = calculatePrescriptionTotal(consultationId);
        BigDecimal companyCoverage = totalAmount; // 100% couvert
        BigDecimal patientSurplus = BigDecimal.ZERO;

        consultation.setExamTotalAmount(totalAmount);
        consultation.setExamAmountPaid(BigDecimal.ZERO); // Pas de paiement patient

        List<PrescribedExam> exams = prescribedExamRepository.findByConsultationIdAndActiveTrue(consultationId);

        for (PrescribedExam exam : exams) {
            exam.setStatus(PrescribedExamStatus.PAID_PENDING_LAB);
        }
        prescribedExamRepository.saveAll(exams);

        consultation.setStatus(ConsultationStatus.AU_LABO);
        consultation.setStatut("AU_LABO");
        consultation.setUpdatedAt(LocalDateTime.now());

        Consultation savedConsultation = consultationRepository.save(consultation);

        // ── Enregistrer la consommation LABO pour l'abonné ───────────────────────
        try {
            String labDesc = "Examens labo (" + exams.size() + " exam" + (exams.size() > 1 ? "s" : "") + ") - Couverture 100%";
            consumptionService.record(
                    admission.getCompany(),
                    admission.getPatient(),
                    admission,
                    com.hospital.backend.entity.CompanyConsumptionRecord.FluxType.LABO,
                    labDesc,
                    totalAmount,
                    admission.getCoverageRate());
            log.info("💳 [LABO] Consommation LABO enregistrée - total={}, coverage=100%", totalAmount);
        } catch (Exception e) {
            log.error("❌ [LABO] Erreur enregistrement consommation LABO: {}", e.getMessage());
        }

        // 💰 Créer un revenu avec la source LABORATOIRE (montant = 0 pour le patient)
        try {
            Long userId = getCurrentUserId();
            createLabRevenue(savedConsultation, BigDecimal.ZERO, null, Currency.USD, userId);
            log.info("💰 [LABO] Revenu LABORATOIRE créé pour consultation ID: {} (montant patient = 0)", consultationId);
        } catch (Exception e) {
            log.error("❌ [LABO] Erreur lors de la création du revenu LABORATOIRE: {}", e.getMessage(), e);
        }

        return mapToDTO(savedConsultation);
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION')")
    public ConsultationDTO updateConsultationPayment(Long consultationId, Double consulAmountPaid) {
        log.info("💰 [CAISSE] Paiement consultation ID: {} - Montant: {}", consultationId, consulAmountPaid);

        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée: " + consultationId));

        // Mettre à jour le montant payé pour la consultation
        BigDecimal paidAmount = consulAmountPaid != null ? BigDecimal.valueOf(consulAmountPaid) : BigDecimal.ZERO;
        consultation.setConsulAmountPaid(paidAmount.doubleValue());

        // Mettre à jour la date de modification
        consultation.setUpdatedAt(LocalDateTime.now());

        Consultation savedConsultation = consultationRepository.save(consultation);
        log.info("✅ [CAISSE] Paiement consultation enregistré - ID: {}, Montant payé: {}", 
                consultationId, paidAmount);

        return mapToDTO(savedConsultation);
    }

    private com.hospital.backend.dto.ReceptionPaymentDTO mapToReceptionPaymentDTO(Consultation consultation) {
        List<PrescribedExam> prescribedExams = prescribedExamRepository
                .findByConsultationIdAndActiveTrueOrderByCreatedAtDesc(consultation.getId());

        List<com.hospital.backend.dto.ReceptionPaymentDTO.ExamItemDTO> examDTOs = prescribedExams.stream()
                .map(exam -> com.hospital.backend.dto.ReceptionPaymentDTO.ExamItemDTO.builder()
                        .serviceId(exam.getService().getId())
                        .note(exam.getDoctorNote())
                        .build())
                .collect(Collectors.toList());

        return com.hospital.backend.dto.ReceptionPaymentDTO.builder()
                .id(consultation.getId())
                .patientId(consultation.getPatient().getId())
                .patientName(consultation.getPatient().getFirstName() + " " + consultation.getPatient().getLastName())
                .patientPhoto(normalizePhotoUrl(consultation.getPatient().getPhotoUrl()))
                .doctorId(consultation.getDoctor().getId())
                .doctorName(consultation.getDoctor().getFirstName() + " " + consultation.getDoctor().getLastName())
                .motif(consultation.getReasonForVisit())
                .status(consultation.getStatus().name())
                .createdAt(consultation.getCreatedAt())
                .exams(examDTOs)
                .build();
    }

    private com.hospital.backend.dto.TodayProcessedDTO mapToTodayProcessedDTO(Consultation consultation) {
        List<PrescribedExam> prescribedExams = prescribedExamRepository
                .findByConsultationIdAndActiveTrueOrderByCreatedAtDesc(consultation.getId());

        List<com.hospital.backend.dto.ReceptionPaymentDTO.ExamItemDTO> examDTOs = prescribedExams.stream()
                .map(exam -> com.hospital.backend.dto.ReceptionPaymentDTO.ExamItemDTO.builder()
                        .serviceId(exam.getService().getId())
                        .note(exam.getDoctorNote())
                        .build())
                .collect(Collectors.toList());

        return com.hospital.backend.dto.TodayProcessedDTO.builder()
                .id(consultation.getId())
                .patientName(consultation.getPatient().getFirstName() + " " + consultation.getPatient().getLastName())
                .examAmountPaid(consultation.getExamAmountPaid() != null ? consultation.getExamAmountPaid().doubleValue() : null)
                .status(consultation.getStatus().name())
                .processedAt(consultation.getUpdatedAt())
                .exams(examDTOs)
                .build();
    }

    @Override
    public Consultation findById(Long id) {
        return consultationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée: " + id));
    }

    @Override
    public List<ConsultationDTO> findByStatut(String statut) {
        Long hId = HospitalTenantContext.getHospitalId();
        List<Consultation> consultations;
        if (hId != null) {
            consultations = consultationRepository.findByPatientHospitalIdAndStatus(hId, ConsultationStatus.valueOf(statut));
        } else {
            consultations = consultationRepository.findByStatut(statut);
        }
        return consultations.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTEUR', 'ROLE_ADMIN')")
    public ConsultationDTO terminerConsultation(Long consultationId, String diagnostic, List<Long> examenIds) {
        try {
            Consultation consultation = consultationRepository.findById(consultationId)
                    .orElseThrow(() -> new RuntimeException("Consultation non trouvée avec l'ID: " + consultationId));

            BigDecimal montantTotal = BigDecimal.ZERO;
            Set<MedicalService> foundServices = new HashSet<>();

            List<PrescribedExam> existingExams = prescribedExamRepository.findByConsultationId(consultationId);
            if (!existingExams.isEmpty()) {
                prescribedExamRepository.deleteAll(existingExams);
            }

            if (examenIds != null && !examenIds.isEmpty()) {
                // Fetch examens directly instead of services
                List<Examen> examens = examenRepository.findAllById(examenIds);
                
                // Calculate total amount from examens
                montantTotal = examens.stream()
                        .map(examen -> examen.getPrix() != null ? examen.getPrix() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                // Create prescribed exams from examens
                List<PrescribedExam> prescribedExams = examens.stream()
                        .map(examen -> {
                            BigDecimal unitPrice = examen.getPrix() != null ? examen.getPrix() : BigDecimal.ZERO;
                            // Use the associated service if available
                            MedicalService service = examen.getService();
                            
                            String serviceName = service != null ? service.getNom() : examen.getNom();
                            Currency currency = service != null ? service.getCurrency() : Currency.USD;
                            
                            return PrescribedExam.builder()
                                    .consultation(consultation)
                                    .service(service)
                                    .serviceName(serviceName)
                                    .unitPrice(unitPrice)
                                    .quantity(1)
                                    .totalPrice(unitPrice)
                                    .doctorNote("")
                                    .active(true)
                                    .status(PrescribedExamStatus.PRESCRIBED)
                                    .examen(examen)
                                    .referenceMin(examen.getValeurMinReference() != null ? examen.getValeurMinReference().toString() : null)
                                    .referenceMax(examen.getValeurMaxReference() != null ? examen.getValeurMaxReference().toString() : null)
                                    .referenceRangeText(examen.getValeursReferenceFormatees())
                                    .unit(examen.getUnite())
                                    .currency(currency)
                                    .build();
                        })
                        .collect(Collectors.toList());

                prescribedExamRepository.saveAll(prescribedExams);

                consultation.setExams(examenIds.stream()
                        .map(serviceId -> new ExamItem(serviceId, null))
                        .collect(Collectors.toList()));

                consultation.setRequiresLabTest(true);
                consultation.setExamTotalAmount(montantTotal);
                consultation.setExamAmountPaid(BigDecimal.ZERO);
                consultation.setStatus(ConsultationStatus.EXAMENS_PRESCRITS);
                consultation.setStatut("EXAMENS_PRESCRITS");
            } else {
                consultation.setRequiresLabTest(false);
                consultation.setExamTotalAmount(BigDecimal.ZERO);
                consultation.setExamAmountPaid(BigDecimal.ZERO);
                consultation.setStatus(ConsultationStatus.COMPLETED);
                consultation.setStatut("COMPLETED");
            }

            if (diagnostic != null && !diagnostic.trim().isEmpty()) {
                consultation.setDiagnosis(diagnostic);
            }

            consultation.setUpdatedAt(LocalDateTime.now());

            Consultation savedConsultation = consultationRepository.save(consultation);
            
            // 🎯 Génération automatique de la fiche médicale si tout est payé
            generateDossierIfFullyPaid(savedConsultation);
            
            return mapToDTO(savedConsultation);

        } catch (Exception e) {
            log.error("Erreur lors de la terminaison de la consultation {}: {}", consultationId, e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la terminaison de la consultation: " + e.getMessage());
        }
    }

    @Override
    public List<ConsultationDTO> getAllConsultations() {
        Long hId = HospitalTenantContext.getHospitalId();
        List<Consultation> consultations;
        if (hId != null) {
            consultations = consultationRepository.findByPatientHospitalId(hId);
        } else {
            consultations = consultationRepository.findAll();
        }
        return consultations.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private String getPatientName(Consultation c) {
        if (c == null || c.getPatient() == null) return "Patient Inconnu";
        return c.getPatient().getFirstName() + " " + c.getPatient().getLastName();
    }

    private String getDoctorName(Consultation c) {
        if (c == null || c.getDoctor() == null) return "Non assigné";
        return c.getDoctor().getFirstName() + " " + c.getDoctor().getLastName();
    }

    private String getPatientPhoto(Consultation c) {
        if (c == null || c.getPatient() == null || c.getPatient().getPhotoUrl() == null) return null;
        return c.getPatient().getPhotoUrl();
    }

    private String getConsultationStatus(Consultation c) {
        if (c == null || c.getStatus() == null) return "EN_ATTENTE";
        return c.getStatus().toString();
    }

    @Override
    @Transactional
    public List<ConsultationListDTO> getConsultationsForDoctor(Long doctorId) {
        List<Consultation> consultations = consultationRepository.findByDoctorIdWithDetails(doctorId);

        return consultations.stream()
                .map(this::mapToListDTO)
                .collect(Collectors.toList());
    }

    private ConsultationListDTO mapToListDTO(Consultation c) {
        Double totalAmount = 0.0;
        Integer examCount = 0;

        try {
            if (c.getPrescribedExams() != null) {
                List<PrescribedExam> activeExams = c.getPrescribedExams().stream()
                        .filter(pe -> pe.getActive() == null || pe.getActive())
                        .collect(Collectors.toList());

                examCount = activeExams.size();
                totalAmount = activeExams.stream()
                        .map(pe -> pe.getTotalPrice() != null
                                ? pe.getTotalPrice().doubleValue()
                                : (pe.getUnitPrice() != null ? pe.getUnitPrice().doubleValue() : 0.0))
                        .reduce(0.0, Double::sum);
            }
        } catch (Exception e) {
            log.warn("[DEBUG] Erreur calcul montant exams: {}", e.getMessage());
        }

        String poids = c.getAdmission() != null && c.getAdmission().getPoids() != null
                ? c.getAdmission().getPoids() : c.getPoids();
        String temperature = c.getAdmission() != null && c.getAdmission().getTemperature() != null
                ? c.getAdmission().getTemperature() : c.getTemperature();
        String taille = c.getAdmission() != null && c.getAdmission().getTaille() != null
                ? c.getAdmission().getTaille() : c.getTaille();
        String tensionArterielle = c.getAdmission() != null && c.getAdmission().getTensionArterielle() != null
                ? c.getAdmission().getTensionArterielle() : c.getTensionArterielle();
        Long admissionId = c.getAdmission() != null ? c.getAdmission().getId() : null;

        return ConsultationListDTO.builder()
                .id(c.getId())
                .consultationCode(c.getConsultationCode())
                .patientName(getPatientName(c))
                .patientId(c.getPatient() != null ? c.getPatient().getId() : null)
                .patientPhoto(getPatientPhoto(c))
                .doctorName(getDoctorName(c))
                .reasonForVisit(getMotif(c))
                .status(getConsultationStatus(c))
                .createdAt(c.getCreatedAt())
                .examTotalAmount(totalAmount)
                .examCount(examCount)
                .poids(poids)
                .temperature(temperature)
                .taille(taille)
                .tensionArterielle(tensionArterielle)
                .admissionId(admissionId)
                .build();
    }

    @Override
    @Transactional
    public ConsultationDTO terminerConsultation(Long id, TerminationDTO dto) {
        // ✅ Utiliser findByIdWithExams pour charger patient + examens (évite LazyInitializationException)
        Consultation consultation = consultationRepository.findByIdWithExams(id)
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée: " + id));

        List<PrescribedExam> existingExams = prescribedExamRepository.findByConsultationId(id);
        if (!existingExams.isEmpty()) {
            prescribedExamRepository.deleteAll(existingExams);
        }

        if (dto.getExams() != null && !dto.getExams().isEmpty()) {
            List<PrescribedExam> prescribedExams = new ArrayList<>();
            BigDecimal totalAmount = BigDecimal.ZERO;

            for (TerminationDTO.ExamDTO examDto : dto.getExams()) {
                MedicalService service = serviceRepository.findById(examDto.getServiceId())
                        .orElseThrow(() -> new RuntimeException("Service non trouvé: " + examDto.getServiceId()));

                BigDecimal unitPrice = BigDecimal.valueOf(service.getPrix());
                totalAmount = totalAmount.add(unitPrice);

                // Récupérer l'examen lié pour les valeurs de référence
                Examen examenLie = examenRepository.findByServiceId(service.getId()).orElse(null);
                String refMin = null;
                String refMax = null;
                String refRangeText = null;
                String unit = null;
                if (examenLie != null) {
                    refMin = examenLie.getValeurMinReference() != null ? examenLie.getValeurMinReference().toString() : null;
                    refMax = examenLie.getValeurMaxReference() != null ? examenLie.getValeurMaxReference().toString() : null;
                    unit = examenLie.getUnite();
                    if (refMin != null && refMax != null) {
                        refRangeText = examenLie.getValeursReferenceFormatees();
                    }
                }

                PrescribedExam prescribedExam = PrescribedExam.builder()
                        .consultation(consultation)
                        .service(service)
                        .serviceName(service.getNom())
                        .unitPrice(unitPrice)
                        .quantity(1)
                        .totalPrice(unitPrice)
                        .doctorNote(examDto.getNote())
                        .active(true)
                        .status(PrescribedExamStatus.PRESCRIBED)
                        .examen(examenLie)
                        .referenceMin(refMin)
                        .referenceMax(refMax)
                        .referenceRangeText(refRangeText)
                        .unit(unit)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();

                prescribedExams.add(prescribedExam);
            }

            prescribedExams = prescribedExamRepository.saveAll(prescribedExams);
            consultation.setPrescribedExams(prescribedExams);

            Admission admission = consultation.getAdmission();
            if (admission == null) {
                admission = Admission.builder()
                        .patient(consultation.getPatient())
                        .doctor(consultation.getDoctor())
                        .reasonForVisit(consultation.getReasonForVisit())
                        .totalAmount(totalAmount)
                        .serviceFee(totalAmount)
                        .admissionDate(LocalDateTime.now())
                        .status(Admission.AdmissionStatus.EN_ATTENTE)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();
            } else {
                // ✅ Ajouter les examens au montant existant (sans écraser registrationFee/serviceFee)
                BigDecimal currentTotal = admission.getTotalAmount() != null ? admission.getTotalAmount() : BigDecimal.ZERO;
                BigDecimal newTotal = currentTotal.add(totalAmount);
                admission.setTotalAmount(newTotal);
                // Ajouter les examens au serviceFee (les examens font partie des services)
                BigDecimal currentServiceFee = admission.getServiceFee() != null ? admission.getServiceFee() : BigDecimal.ZERO;
                admission.setServiceFee(currentServiceFee.add(totalAmount));
                admission.setStatus(Admission.AdmissionStatus.EN_ATTENTE);
                admission.setUpdatedAt(LocalDateTime.now());
                log.info("💰 [CONSULTATION] Examens ajoutés - Ancien total: {}, Examens: {}, Nouveau total: {}",
                    currentTotal, totalAmount, newTotal);
            }

            admission = admissionRepository.save(admission);
            consultation.setAdmission(admission);

            consultation.setDiagnosis(dto.getDiagnostic());
            consultation.setTreatment(dto.getTraitement());
            consultation.setRequiresLabTest(true);
            consultation.setExamTotalAmount(totalAmount);
            consultation.setExamAmountPaid(BigDecimal.ZERO);
            consultation.setStatus(ConsultationStatus.EXAMENS_PRESCRITS);
            consultation.setStatut("EXAMENS_PRESCRITS");
            consultation.setUpdatedAt(LocalDateTime.now());

            consultation = consultationRepository.save(consultation);
        } else {
            consultation.setDiagnosis(dto.getDiagnostic());
            consultation.setTreatment(dto.getTraitement());
            consultation.setRequiresLabTest(false);
            consultation.setExamTotalAmount(BigDecimal.ZERO);
            consultation.setExamAmountPaid(BigDecimal.ZERO);
            consultation.setStatus(ConsultationStatus.COMPLETED);
            consultation.setStatut("COMPLETED");
            consultation.setUpdatedAt(LocalDateTime.now());

            consultation = consultationRepository.save(consultation);
            
            // 🎯 Génération automatique de la fiche médicale si tout est payé
            generateDossierIfFullyPaid(consultation);
        }

        return mapToDTO(consultation);
    }
    
    /**
     * 🎯 Génère automatiquement le dossier patient si la consultation est terminée et tout payé
     */
    @Override
    public void generateDossierIfFullyPaid(Consultation consultation) {
        try {
            // Vérifier que la consultation est bien dans un état "terminé" ou "payé"
            ConsultationStatus status = consultation.getStatus();
            if (status != ConsultationStatus.COMPLETED
                && status != ConsultationStatus.TERMINE
                && status != ConsultationStatus.PAYEE
                && status != ConsultationStatus.EXAMENS_PAYES) {
                log.info("📋 [DOSSIER] Consultation {} statut non éligible ({}), pas de génération",
                    consultation.getId(), status);
                return;
            }
            
            // Note: L'admission est optionnelle - la vérification du paiement utilise les champs directs
            if (consultation.getAdmission() == null) {
                log.warn("⚠️ [DOSSIER] Consultation {} sans admission - vérification du paiement via les champs directs",
                    consultation.getId());
            }
            
            // Calculer le montant total dû (frais fiche + consultation + examens)
            // ✅ CORRECTION: Utiliser les champs précis de Consultation pour éviter
            // le double-comptage (admission.serviceFee peut déjà inclure les examens)
            BigDecimal totalDue = BigDecimal.ZERO;
            
            // Frais de fiche
            if (consultation.getFicheAmountDue() != null) {
                totalDue = totalDue.add(BigDecimal.valueOf(consultation.getFicheAmountDue()));
            }
            
            // Frais de consultation
            if (consultation.getConsulAmountDue() != null) {
                totalDue = totalDue.add(BigDecimal.valueOf(consultation.getConsulAmountDue()));
            }
            
            // Frais d'examens prescrits
            if (consultation.getExamTotalAmount() != null) {
                totalDue = totalDue.add(consultation.getExamTotalAmount());
            }
            
            // Montant payé
            BigDecimal totalPaid = BigDecimal.ZERO;
            if (consultation.getFicheAmountPaid() != null) {
                totalPaid = totalPaid.add(BigDecimal.valueOf(consultation.getFicheAmountPaid()));
            }
            if (consultation.getConsulAmountPaid() != null) {
                totalPaid = totalPaid.add(BigDecimal.valueOf(consultation.getConsulAmountPaid()));
            }
            if (consultation.getExamAmountPaid() != null) {
                totalPaid = totalPaid.add(consultation.getExamAmountPaid());
            }
            
            // Vérifier si tout est payé (avec marge de 0.01 pour les arrondis)
            boolean isFullyPaid = totalPaid.compareTo(totalDue) >= 0 || 
                                 totalDue.subtract(totalPaid).compareTo(new BigDecimal("0.01")) <= 0;

            // ✅ FALLBACK: si la facture liée est PAYEE, considérer le paiement confirmé
            // (cas où ficheAmountPaid/consulAmountPaid ne sont pas renseignés dans l'entité)
            if (!isFullyPaid && consultation.getInvoice() != null
                    && consultation.getInvoice().getStatus() == InvoiceStatus.PAYEE) {
                isFullyPaid = true;
                log.info("💰 [DOSSIER] Facture {} PAYEE - consultation {} considérée comme payée (fallback facture)",
                    consultation.getInvoice().getInvoiceCode(), consultation.getId());
            }
            
            log.info("💰 [DOSSIER] Consultation {} - Total dû: {}, Total payé: {}, Tout payé: {}", 
                consultation.getId(), totalDue, totalPaid, isFullyPaid);
            
            if (!isFullyPaid) {
                log.info("⛔ [DOSSIER] Consultation {} - Paiement incomplet, dossier NON généré", 
                    consultation.getId());
                return;
            }
            
            // Vérifier si un dossier existe déjà pour cette consultation
            if (patientDocumentService.dossierExistsForConsultation(consultation.getId())) {
                log.info("📋 [DOSSIER] Un dossier existe déjà pour la consultation {}", consultation.getId());
                return;
            }
            
            // Générer le dossier patient
            log.info("✅ [DOSSIER] Génération du dossier patient pour consultation {} - Tout payé !", 
                consultation.getId());
            patientDocumentService.generatePatientDossier(consultation.getId());
            
        } catch (Exception e) {
            log.error("❌ [DOSSIER] Erreur lors de la génération automatique: {}", e.getMessage(), e);
            // Ne pas bloquer le processus si la génération échoue
        }
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION')")
    public ConsultationDTO adjustPrescribedExam(Long consultationId, List<ExamAdjustmentDTO> adjustments) {
        log.info("🛠️ [CONSULTATION] Ajustement des examens prescrits pour la consultation {}", consultationId);

        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));

        if (adjustments == null || adjustments.isEmpty()) {
            log.warn("Aucun ajustement fourni pour la consultation {}", consultationId);
            return mapToDTO(consultation);
        }

        List<PrescribedExam> updatedExams = new ArrayList<>();

        for (ExamAdjustmentDTO adjustment : adjustments) {
            if (adjustment.getExamId() == null) {
                log.warn("Ajustement sans examId ignoré pour la consultation {}", consultationId);
                continue;
            }

            PrescribedExam exam = prescribedExamRepository.findById(adjustment.getExamId())
                    .orElseThrow(() -> new ResourceNotFoundException("Examen prescrit introuvable: " + adjustment.getExamId()));

            // Vérifier que l'examen appartient bien à la consultation
            if (!exam.getConsultation().getId().equals(consultationId)) {
                throw new IllegalArgumentException("L'examen " + adjustment.getExamId() + " n'appartient pas à la consultation " + consultationId);
            }

            // Appliquer les ajustements
            boolean hasChanges = false;

            if (adjustment.getQuantity() != null && adjustment.getQuantity() > 0) {
                exam.setQuantity(adjustment.getQuantity());
                hasChanges = true;
                log.debug("Quantité mise à jour pour l'examen {}: {}", adjustment.getExamId(), adjustment.getQuantity());
            }

            if (adjustment.getActive() != null) {
                exam.setActive(adjustment.getActive());
                hasChanges = true;
                log.debug("Statut actif mis à jour pour l'examen {}: {}", adjustment.getExamId(), adjustment.getActive());
            }

            if (adjustment.getCashierNote() != null && !adjustment.getCashierNote().trim().isEmpty()) {
                exam.setCashierNote(adjustment.getCashierNote());
                hasChanges = true;
                log.debug("Note caissier ajoutée pour l'examen {}: {}", adjustment.getExamId(), adjustment.getCashierNote());
            }

            if (hasChanges) {
                exam.setUpdatedAt(LocalDateTime.now());
                updatedExams.add(exam);
            }
        }

        // Sauvegarder tous les examens modifiés
        if (!updatedExams.isEmpty()) {
            prescribedExamRepository.saveAll(updatedExams);
            log.info("✅ {} examens ajustés pour la consultation {}", updatedExams.size(), consultationId);

            // Recalculer le montant total des examens
            BigDecimal newTotal = prescribedExamRepository.calculateAdjustedTotalByConsultation(consultationId);
            consultation.setExamTotalAmount(newTotal);
            consultation.setUpdatedAt(LocalDateTime.now());
            consultationRepository.save(consultation);

            log.info("📊 Nouveau total des examens pour la consultation {}: {}", consultationId, newTotal);
        }

        return mapToDTO(consultation);
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTEUR', 'ROLE_ADMIN')")
    public ConsultationDTO finaliserConsultation(Long id, FinaliserConsultationRequest request) {
        log.info("📋 [FINALISER] Consultation ID: {} - Finalisation avec prescription", id);
        
        if (id == null) {
            throw new IllegalArgumentException("L'ID de consultation est requis");
        }
        
        Consultation consultation = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable: " + id));
        
        // Mettre à jour le diagnostic final si fourni
        if (request != null && request.getDiagnosticFinal() != null && !request.getDiagnosticFinal().isEmpty()) {
            consultation.setDiagnosis(request.getDiagnosticFinal());
            log.debug("Diagnostic mis à jour pour consultation {}", id);
        }
        
        // Ajouter les notes si présentes
        if (request != null && request.getNotes() != null && !request.getNotes().isEmpty()) {
            consultation.setNotes(request.getNotes());
        }
        
        // Changer le statut en TERMINE (utilise une valeur existante dans la contrainte SQL)
        consultation.setStatus(ConsultationStatus.TERMINE);
        consultation.setStatut("TERMINE");
        consultation.setUpdatedAt(LocalDateTime.now());

        // ✅ Générer le numéro de fiche séquentiel si non existant (immuable)
        if (consultation.getNumeroFiche() == null || consultation.getNumeroFiche().isEmpty()) {
            String numeroFiche = generateSequentialNumeroFiche();
            consultation.setNumeroFiche(numeroFiche);
            log.info("✅ [FINALISER] Numéro de fiche généré: {} pour consultation {}", numeroFiche, id);
        }

        // ✅ Ajouter la validation et signature si fournies dans la requête
        if (request != null) {
            Long signataireId = request.getSignataireId();
            String signatureImage = request.getSignatureImage();

            if (signataireId != null || (signatureImage != null && !signatureImage.isEmpty())) {
                consultation.validate(signataireId, signatureImage);
                log.info("✅ [FINALISER] Consultation {} validée par signataire: {}", id, signataireId);
            }
        }

        try {
            Consultation saved = consultationRepository.save(consultation);
            log.info("✅ [FINALISER] Consultation ID: {} - Statut changé en TERMINE avec succès", id);

            // 💊 Créer la prescription si des items sont fournis (fusion avec /api/prescriptions/create)
            if (request != null && request.getItems() != null && !request.getItems().isEmpty()) {
                List<PrescriptionDTO.PrescriptionItemDTO> prescriptionItems = request.getItems().stream()
                    .map(item -> PrescriptionDTO.PrescriptionItemDTO.builder()
                        .medicationId(item.getMedicationId())
                        .medicationName(item.getMedicationName())
                        .dosage(item.getDosage())
                        .frequency(item.getFrequency())
                        .timeSlots(item.getTimeSlots())
                        .duration(item.getDuration())
                        .quantityPerDose(item.getQuantityPerDose())
                        .instructions(item.getInstructions())
                        .active(item.getActive())
                        .build())
                    .collect(Collectors.toList());

                PrescriptionDTO prescriptionDTO = PrescriptionDTO.builder()
                    .consultationId(id)
                    .patientId(request.getPatientId())
                    .doctorId(saved.getDoctor() != null ? saved.getDoctor().getId() : null)
                    .notes(request.getNotes() != null ? request.getNotes() : request.getDiagnosticFinal())
                    .status(PrescriptionStatus.PRESCRIPTION_ENVOYEE)
                    .items(prescriptionItems)
                    .build();

                try {
                    prescriptionService.createPrescription(prescriptionDTO);
                    log.info("✅ [FINALISER] Prescription créée pour consultation {}", id);
                } catch (Exception ex) {
                    log.error("❌ [FINALISER] Erreur création prescription pour consultation {}: {}", id, ex.getMessage());
                }
            }
            // ✅ Retourner un DTO léger (sans mapToDTO coûteux) pour éviter les N+1 queries
            return ConsultationDTO.builder()
                .id(saved.getId())
                .consultationCode(saved.getConsultationCode())
                .status(saved.getStatus())
                .statut(saved.getStatut())
                .build();
        } catch (Exception e) {
            log.error("❌ [FINALISER] Erreur lors de la sauvegarde de la consultation {}: {}", id, e.getMessage());
            throw new RuntimeException("Erreur lors de la finalisation de la consultation: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_PATIENT', 'ROLE_RECEPTION')")
    public PatientJourneyDTO getPatientJourney(Long consultationId) {
        log.info("📋 [PARCOURS] Génération du dossier patient complet pour consultation ID: {}", consultationId);

        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable: " + consultationId));

        // Obtenir l'utilisateur courant
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String generatedBy = auth != null ? auth.getName() : "System";

        // Construire le DTO
        // ✅ Abonnement entreprise
        Boolean isAbonne = false;
        String companyName = null;
        try {
            if (consultation.getAdmission() != null) {
                isAbonne = consultation.getAdmission().getIsAbonne() != null
                        ? consultation.getAdmission().getIsAbonne() : false;
                if (consultation.getAdmission().getCompany() != null) {
                    companyName = consultation.getAdmission().getCompany().getName();
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ Erreur lecture abonnement pour patient journey: {}", e.getMessage());
        }

        PatientJourneyDTO journey = PatientJourneyDTO.builder()
                // Informations générales
                .consultationId(consultation.getId())
                .consultationCode(consultation.getConsultationCode())
                .consultationDate(consultation.getConsultationDate())
                .status(consultation.getStatus() != null ? consultation.getStatus().name() : consultation.getStatut())
                .doctorName(getJourneyDoctorName(consultation))
                .doctorSpecialty(getJourneyDoctorSpecialty(consultation))

                // Patient
                .patientId(consultation.getPatient() != null ? consultation.getPatient().getId() : null)
                .patientName(getJourneyPatientName(consultation))
                .patientCode(consultation.getPatient() != null ? consultation.getPatient().getPatientCode() : null)
                .patientPhone(consultation.getPatient() != null ? consultation.getPatient().getPhoneNumber() : null)
                .patientAddress(consultation.getPatient() != null ? consultation.getPatient().getAddress() : null)
                .patientAge(getJourneyPatientAge(consultation.getPatient()))
                .patientGender(consultation.getPatient() != null && consultation.getPatient().getGender() != null ? consultation.getPatient().getGender().name() : null)

                // Abonnement
                .isAbonne(isAbonne)
                .companyName(companyName)

                // Triage
                .triageInfo(buildTriageInfo(consultation))

                // Labo
                .labResults(getJourneyLabResults(consultation))
                .labInterpretation(consultation.getDiagnosis())
                .labCompletedDate(getJourneyLabCompletionDate(consultation))

                // Prescription et Pharmacie
                .prescription(getJourneyPrescriptionSummary(consultation))
                .pharmacyStatus(getJourneyPharmacyStatus(consultation))

                // Finance
                .billingSummary(getJourneyBillingSummary(consultation))

                // Métadonnées
                .reportGeneratedAt(LocalDateTime.now())
                .generatedBy(generatedBy)

                // Validation et Signature
                .numeroFiche(consultation.getNumeroFiche())
                .dateValidation(consultation.getDateValidation())
                .signataireId(consultation.getSignataireId())
                .signatureImage(consultation.getSignatureImage())
                .isValidated(consultation.getIsValidated())
                .build();

        log.info("✅ [PARCOURS] Dossier patient généré avec succès pour consultation ID: {}", consultationId);
        return journey;
    }

    // Méthodes helper pour construire les sections du parcours

    private String getJourneyDoctorName(Consultation consultation) {
        if (consultation.getDoctor() != null) {
            return "Dr. " + consultation.getDoctor().getFirstName() + " " + consultation.getDoctor().getLastName();
        }
        return "Non assigné";
    }

    private String getJourneyDoctorSpecialty(Consultation consultation) {
        if (consultation.getDoctor() != null) {
            // User entity doesn't have specialty field, use department name or default
            if (consultation.getDoctor().getDepartment() != null) {
                return consultation.getDoctor().getDepartment().getNom();
            }
            return "Médecin";
        }
        return "Non assigné";
    }

    private String getJourneyPatientName(Consultation consultation) {
        if (consultation.getPatient() != null) {
            return consultation.getPatient().getFirstName() + " " + consultation.getPatient().getLastName();
        }
        return "Patient inconnu";
    }

    private String getJourneyPatientAge(com.hospital.backend.entity.Patient patient) {
        if (patient == null || patient.getDateOfBirth() == null) return "N/A";
        int age = java.time.Period.between(patient.getDateOfBirth(), java.time.LocalDate.now()).getYears();
        return age + " ans";
    }

    private PatientJourneyDTO.TriageInfoDTO buildTriageInfo(Consultation consultation) {
        Double poidsValue = null;
        Double tailleValue = null;
        Double tempValue = null;
        
        try {
            if (consultation.getPoids() != null && !consultation.getPoids().isEmpty()) {
                poidsValue = Double.parseDouble(consultation.getPoids());
            }
        } catch (NumberFormatException e) {
            // Keep null if parsing fails
        }
        
        try {
            if (consultation.getTaille() != null && !consultation.getTaille().isEmpty()) {
                tailleValue = Double.parseDouble(consultation.getTaille());
            }
        } catch (NumberFormatException e) {
            // Keep null if parsing fails
        }
        
        try {
            if (consultation.getTemperature() != null && !consultation.getTemperature().isEmpty()) {
                tempValue = Double.parseDouble(consultation.getTemperature());
            }
        } catch (NumberFormatException e) {
            // Keep null if parsing fails
        }
        
        return PatientJourneyDTO.TriageInfoDTO.builder()
                .poids(poidsValue)
                .taille(tailleValue)
                .temperature(tempValue)
                .tensionArterielle(consultation.getTensionArterielle())
                .motifVisite(consultation.getReasonForVisit())
                .niveauUrgence(getJourneyUrgenceLevel(consultation))
                .triageDate(consultation.getConsultationDate())
                .build();
    }

    private String getJourneyUrgenceLevel(Consultation consultation) {
        // Logique pour déterminer le niveau d'urgence basé sur les signes vitaux
        try {
            if (consultation.getTemperature() != null && !consultation.getTemperature().isEmpty()) {
                double temp = Double.parseDouble(consultation.getTemperature());
                if (temp > 39) return "URGENT";
            }
        } catch (NumberFormatException e) {
            // Ignore parsing error
        }
        
        if (consultation.getTensionArterielle() != null) {
            String[] parts = consultation.getTensionArterielle().split("/");
            if (parts.length == 2) {
                try {
                    int sys = Integer.parseInt(parts[0].trim());
                    if (sys > 180) return "URGENT";
                    if (sys > 140) return "ÉLEVÉ";
                } catch (NumberFormatException ignored) {}
            }
        }
        return "NORMAL";
    }

    private List<PatientJourneyDTO.LabResultDTO> getJourneyLabResults(Consultation consultation) {
        return labTestRepository.findAllByConsultationId(consultation.getId()).stream()
                .map(lt -> PatientJourneyDTO.LabResultDTO.builder()
                        .testId(lt.getId())
                        .testName(lt.getTestName())
                        .resultValue(lt.getResults())
                        .unit(lt.getUnit())
                        .referenceRange(lt.getNormalRange())
                        .interpretation(lt.getInterpretation())
                        .isCritical(lt.getStatus() != null && lt.getStatus().name().contains("CRITIQUE"))
                        .resultDate(lt.getProcessedAt())
                        .validatedBy(lt.getProcessedBy() != null ? lt.getProcessedBy().getUsername() : null)
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }

    private java.time.LocalDateTime getJourneyLabCompletionDate(Consultation consultation) {
        return labTestRepository.findAllByConsultationId(consultation.getId()).stream()
                .map(lt -> lt.getProcessedAt())
                .filter(date -> date != null)
                .max(java.time.LocalDateTime::compareTo)
                .orElse(null);
    }

    private PatientJourneyDTO.PrescriptionSummaryDTO getJourneyPrescriptionSummary(Consultation consultation) {
        // Récupérer la prescription associée à cette consultation
        var prescriptions = prescriptionRepository.findAllByConsultationId(consultation.getId());
        if (prescriptions.isEmpty()) {
            return null;
        }
        var prescription = prescriptions.get(0);

        return PatientJourneyDTO.PrescriptionSummaryDTO.builder()
                .prescriptionId(prescription.getId())
                .prescriptionCode(prescription.getPrescriptionCode())
                .diagnosis(consultation.getDiagnosis())
                .notes(prescription.getNotes())
                .prescriptionDate(prescription.getCreatedAt())
                .items(prescription.getItems().stream()
                        .map(item -> PatientJourneyDTO.PrescriptionItemDTO.builder()
                                .medicationId(item.getMedication() != null ? item.getMedication().getId() : null)
                                .medicationName(item.getMedication() != null ? item.getMedication().getName() : null)
                                .genericName(item.getMedication() != null ? item.getMedication().getGenericName() : null)
                                .dosage(item.getDosage())
                                .frequency(item.getFrequency())
                                .timeSlots(item.getTimeSlots())
                                .duration(item.getDuration() != null ? item.getDuration().toString() : null)
                                .quantityPerDose(item.getQuantityPerDose())
                                .instructions(item.getInstructions())
                                .prescribedQuantity(item.getQuantity())
                                .unitPrice(item.getUnitPrice() != null ? java.math.BigDecimal.valueOf(item.getUnitPrice()) : null)
                                .totalPrice(item.getTotalPrice() != null ? java.math.BigDecimal.valueOf(item.getTotalPrice()) : null)
                                .build())
                        .collect(java.util.stream.Collectors.toList()))
                .build();
    }

    private PatientJourneyDTO.PharmacyStatusDTO getJourneyPharmacyStatus(Consultation consultation) {
        // TODO: Implémenter quand la logique de dispensation est complète
        // Pour l'instant, retourner un statut basé sur les items de prescription
        var prescription = getJourneyPrescriptionSummary(consultation);
        if (prescription == null) return null;

        var pharmaItems = prescription.getItems().stream()
                .map(item -> PatientJourneyDTO.PharmacyItemDTO.builder()
                        .medicationId(item.getMedicationId())
                        .medicationName(item.getMedicationName())
                        .prescribedQty(item.getPrescribedQuantity())
                        .deliveredQty(item.getPrescribedQuantity()) // TODO: Récupérer la vraie quantité livrée
                        .refusedQty(0)
                        .status("SERVI") // TODO: Déterminer le vrai statut
                        .isAvailable(true)
                        .build())
                .collect(java.util.stream.Collectors.toList());

        return PatientJourneyDTO.PharmacyStatusDTO.builder()
                .status("COMPLETEMENT_SERVI")
                .items(pharmaItems)
                .build();
    }

    private PatientJourneyDTO.BillingSummaryDTO getJourneyBillingSummary(Consultation consultation) {
        try {
            // ✅ CORRECTION: consultationFee = ficheAmountDue + consulAmountDue
            // ficheAmountDue = frais de fiche (frais de dossier)
            // consulAmountDue = frais de consultation/service
            java.math.BigDecimal ficheFee = consultation.getFicheAmountDue() != null ?
                    java.math.BigDecimal.valueOf(consultation.getFicheAmountDue().doubleValue()) : java.math.BigDecimal.ZERO;
            java.math.BigDecimal consulFee = consultation.getConsulAmountDue() != null ?
                    java.math.BigDecimal.valueOf(consultation.getConsulAmountDue().doubleValue()) : java.math.BigDecimal.ZERO;
            java.math.BigDecimal consultationFee = ficheFee.add(consulFee);

            // ✅ Déterminer si c'est un nouveau patient (ficheFee > 0 indique nouveau patient)
            boolean isNewPatient = ficheFee.compareTo(java.math.BigDecimal.ZERO) > 0;
            // ✅ CORRECTION: Si ficheAmountDue = 0 (ancien patient), fraisFichePaid = true (rien à payer)
            // Sinon, vérifier si ficheAmountPaid > 0
            boolean fraisFichePaid = ficheFee.compareTo(java.math.BigDecimal.ZERO) == 0 ||
                    (consultation.getFicheAmountPaid() != null && consultation.getFicheAmountPaid() > 0);

            // Recalculer le montant des examens à partir des examens prescrits actifs
            java.math.BigDecimal examFee = java.math.BigDecimal.ZERO;
            try {
                if (consultation.getId() != null) {
                    examFee = calculatePrescriptionTotal(consultation.getId());
                }
            } catch (Exception e) {
                log.warn("⚠️ Erreur lors du calcul du total des examens pour consultation {}: {}",
                        consultation.getId(), e.getMessage());
            }

            if (examFee == null || examFee.compareTo(java.math.BigDecimal.ZERO) == 0) {
                // Fallback sur l'ancienne valeur stockée si pas d'examens prescrits
                examFee = consultation.getExamTotalAmount() != null ?
                        java.math.BigDecimal.valueOf(consultation.getExamTotalAmount().doubleValue()) : java.math.BigDecimal.ZERO;
            }

            // ✅ Calculer le montant des prescriptions pharmacie
            java.math.BigDecimal pharmacyFee = java.math.BigDecimal.ZERO;
            java.math.BigDecimal pharmacyPaid = java.math.BigDecimal.ZERO;
            boolean isPharmacyPaid = false;
            
            try {
                // Utiliser le repository pour éviter le lazy loading problem
                var prescriptions = prescriptionRepository.findAllByConsultationId(consultation.getId());
                if (prescriptions != null && !prescriptions.isEmpty()) {
                    for (com.hospital.backend.entity.Prescription prescription : prescriptions) {
                        if (prescription.getTotalAmount() != null) {
                            pharmacyFee = pharmacyFee.add(prescription.getTotalAmount());
                        }
                        if (prescription.getAmountPaid() != null) {
                            pharmacyPaid = pharmacyPaid.add(prescription.getAmountPaid());
                        }
                        // Si une prescription est payée, on considère la pharmacie comme payée
                        if (com.hospital.backend.entity.PrescriptionStatus.PAYEE.equals(prescription.getStatus())) {
                            isPharmacyPaid = true;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("⚠️ Erreur lors du calcul du total pharmacie pour consultation {}: {}",
                        consultation.getId(), e.getMessage());
            }

            // ✅ CORRECTION: totalPaid = ficheAmountPaid + consulAmountPaid + examPaid + pharmacyPaid
            // ficheAmountPaid = montant payé pour la fiche (frais de dossier)
            // consulAmountPaid = montant payé pour la consultation/service
            java.math.BigDecimal fichePaid = consultation.getFicheAmountPaid() != null ?
                    java.math.BigDecimal.valueOf(consultation.getFicheAmountPaid().doubleValue()) : java.math.BigDecimal.ZERO;
            java.math.BigDecimal consulPaid = consultation.getConsulAmountPaid() != null ?
                    java.math.BigDecimal.valueOf(consultation.getConsulAmountPaid().doubleValue()) : java.math.BigDecimal.ZERO;
            java.math.BigDecimal examPaid = consultation.getExamAmountPaid() != null ?
                    consultation.getExamAmountPaid() : java.math.BigDecimal.ZERO;

            // Total payé incluant fiche, consultation, examens ET pharmacie
            java.math.BigDecimal totalPaid = fichePaid.add(consulPaid).add(examPaid).add(pharmacyPaid);

            java.math.BigDecimal total = consultationFee.add(examFee).add(pharmacyFee);
            java.math.BigDecimal balance = total.subtract(totalPaid);

            // Déterminer le statut de paiement
            String status;
            ConsultationStatus consultStatus = consultation.getStatus();
            
            log.info("[DEBUG] Calcul statut paiement - consultId: {}, status: {}, totalPaid: {}, total: {}", 
                consultation.getId(), consultStatus, totalPaid, total);
            
            // Si tout est payé → SOLDE
            if (balance.compareTo(java.math.BigDecimal.ZERO) == 0 && total.compareTo(java.math.BigDecimal.ZERO) > 0) {
                status = "SOLDE";
            } 
            // Si le patient a un statut PAYEE ou a franchi les étapes sans paiement enregistré
            // on considère que la consultation est payée
            else if (consultStatus == ConsultationStatus.PAYEE ||
                     consultStatus == ConsultationStatus.PAID_PENDING_LAB ||
                     consultStatus == ConsultationStatus.PAID_COMPLETED ||
                     consultStatus == ConsultationStatus.TREATED ||
                     consultStatus == ConsultationStatus.RESULTATS_PRETS ||
                     (totalPaid.compareTo(java.math.BigDecimal.ZERO) == 0 && 
                      (consultStatus == ConsultationStatus.EN_COURS || 
                       consultStatus == ConsultationStatus.AU_LABO ||
                       consultStatus == ConsultationStatus.EXAMENS_PAYES ||
                       consultStatus == ConsultationStatus.EXAMENS_PRESCRITS ||
                       consultStatus == ConsultationStatus.TERMINE ||
                       consultStatus == ConsultationStatus.COMPLETED))) {
                log.info("[DEBUG] Statut forcé à SOLDE car status={}", consultStatus);
                status = "SOLDE";
                balance = java.math.BigDecimal.ZERO;
            }
            // Si rien n'est payé et le patient n'a pas encore commencé le parcours → NON_PAYE
            else if (totalPaid.compareTo(java.math.BigDecimal.ZERO) == 0) {
                status = "NON_PAYE";
            } 
            // Sinon → paiement partiel
            else {
                status = "PARTIEL";
            }
            
            log.info("[DEBUG] Statut final: {}", status);

            // Déterminer si consultation et labo sont payés (basé sur montant OU statut)
            // Utiliser ficheAmountPaid en priorité sur consulAmountPaid
            boolean isConsultationPaid = (consultation.getFicheAmountPaid() != null && consultation.getFicheAmountPaid() > 0)
                    || (consultation.getConsulAmountPaid() != null && consultation.getConsulAmountPaid() > 0)
                    || consultStatus == ConsultationStatus.PAYEE
                    || consultStatus == ConsultationStatus.PAID_PENDING_LAB
                    || consultStatus == ConsultationStatus.PAID_COMPLETED
                    || consultStatus == ConsultationStatus.TREATED
                    || consultStatus == ConsultationStatus.RESULTATS_PRETS
                    || consultStatus == ConsultationStatus.AU_LABO
                    || consultStatus == ConsultationStatus.EXAMENS_PAYES
                    || consultationFee.compareTo(java.math.BigDecimal.ZERO) == 0;  // Gratuit = payé

            boolean isLabPaid = (consultation.getExamAmountPaid() != null && consultation.getExamAmountPaid().compareTo(examFee) >= 0)
                    || consultStatus == ConsultationStatus.PAYEE
                    || consultStatus == ConsultationStatus.PAID_PENDING_LAB
                    || consultStatus == ConsultationStatus.PAID_COMPLETED
                    || consultStatus == ConsultationStatus.TREATED
                    || consultStatus == ConsultationStatus.RESULTATS_PRETS
                    || consultStatus == ConsultationStatus.AU_LABO
                    || consultStatus == ConsultationStatus.EXAMENS_PAYES
                    || examFee.compareTo(java.math.BigDecimal.ZERO) == 0;  // Gratuit = payé

            // CORRECTION: Si le statut global est SOLDE, tout est considéré comme payé
            if ("SOLDE".equals(status)) {
                isConsultationPaid = true;
                isLabPaid = true;
                isPharmacyPaid = true;
                log.info("[DEBUG] Statut global SOLDE -> consultationPaid=true, labPaid=true, pharmacyPaid=true");
            }

            return PatientJourneyDTO.BillingSummaryDTO.builder()
                    .invoiceNumber(consultation.getConsultationCode())
                    .invoiceDate(consultation.getConsultationDate())
                    .consultationAmount(consultationFee)
                    .consultationPaid(isConsultationPaid)
                    .labAmount(examFee)
                    .labPaid(isLabPaid)
                    .pharmacyAmount(pharmacyFee)
                    .pharmacyPaid(isPharmacyPaid)
                    .totalAmount(total)
                    .totalPaid(totalPaid)
                    .balanceDue(balance)
                    .paymentStatus(status)
                    .fraisFiche(ficheFee)
                    .fraisFichePaid(fraisFichePaid)
                    .isNewPatient(isNewPatient)
                    .build();
        } catch (Exception e) {
            log.error("❌ Erreur dans getJourneyBillingSummary pour consultation {}: {}", 
                    consultation != null ? consultation.getId() : "null", e.getMessage(), e);
            // Retourner un DTO par défaut pour éviter de casser le chargement
            return PatientJourneyDTO.BillingSummaryDTO.builder()
                    .invoiceNumber(consultation != null ? consultation.getConsultationCode() : "N/A")
                    .consultationAmount(java.math.BigDecimal.ZERO)
                    .labAmount(java.math.BigDecimal.ZERO)
                    .totalAmount(java.math.BigDecimal.ZERO)
                    .totalPaid(java.math.BigDecimal.ZERO)
                    .balanceDue(java.math.BigDecimal.ZERO)
                    .paymentStatus("ERREUR")
                    .build();
        }
    }

    /**
     * Crée un revenu avec la source LABORATOIRE lors du paiement des examens
     */
    private void createLabRevenue(Consultation consultation, BigDecimal amount, String paymentMethodStr, Currency currency, Long userId) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("⚠️ Montant invalide pour création revenu labo: {}", amount);
            return;
        }

        // Résoudre la méthode de paiement
        PaymentMethod paymentMethod = PaymentMethod.ESPECES;
        try {
            if (paymentMethodStr != null && !paymentMethodStr.isBlank()) {
                paymentMethod = PaymentMethod.valueOf(paymentMethodStr.toUpperCase());
            }
        } catch (IllegalArgumentException e) {
            log.warn("⚠️ Méthode de paiement non reconnue: {}, utilisation ESPECES", paymentMethodStr);
        }

        // Utiliser la devise détectée depuis les examens (USD ou CDF)
        Currency resolvedCurrency = currency != null ? currency : Currency.USD;

        // Préparer le patient name
        String patientName = "Patient";
        if (consultation.getPatient() != null) {
            patientName = consultation.getPatient().getFirstName() + " " +
                         consultation.getPatient().getLastName();
        }

        RevenueDTO revenueDTO = RevenueDTO.builder()
            .amount(amount)
            .source(Revenue.RevenueSource.LABORATOIRE)
            .paymentMethod(paymentMethod)
            .currency(resolvedCurrency)
            .description("Paiement examens laboratoire - Patient: " + patientName +
                        " - Consultation ID: " + consultation.getId())
            .date(LocalDateTime.now())
            .build();

        revenueService.createRevenue(revenueDTO, userId != null ? userId : 1L);
        log.info("💰 Revenu LABORATOIRE créé: {} {} pour {} - Consultation ID: {}", amount, resolvedCurrency, patientName, consultation.getId());
    }

    /**
     * ✅ Vérifie si le patient a une fiche active (facturée dans les 12 derniers mois).
     * Vérifie à la fois les admissions (registrationFee > 0) et les consultations legacy.
     */
    private boolean hasActiveFiche(Long patientId) {
        LocalDateTime twelveMonthsAgo = LocalDateTime.now().minusMonths(12);

        // 1. Vérifier dans les admissions
        List<Admission> admissions = admissionRepository.findByPatientId(patientId);
        for (Admission a : admissions) {
            if (a.getAdmissionDate() != null && a.getAdmissionDate().isAfter(twelveMonthsAgo)) {
                if (a.getRegistrationFee() != null && a.getRegistrationFee().compareTo(BigDecimal.ZERO) > 0) {
                    if (a.getStatus() != null && a.getStatus() != Admission.AdmissionStatus.ANNULE) {
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
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * ✅ Récupère le prix de la fiche depuis la configuration
     */
    private BigDecimal getFichePriceFromConfig() {
        HospitalConfig config = hospitalConfigRepository.findFirstByOrderByIdAsc().orElse(null);
        if (config == null || config.getFichePrice() == null) {
            log.warn("⚠️ Prix de la fiche non défini, utilisation de la valeur par défaut 3 USD");
            return new BigDecimal("3");
        }
        return config.getFichePrice();
    }

    private Long getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
                CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
                return userDetails.getUser().getId();
            }
            String username = auth != null ? auth.getName() : null;
            if (username != null) {
                return userRepository.findByUsername(username)
                    .map(User::getId)
                    .orElse(1L);
            }
        } catch (Exception e) {
            log.warn("⚠️ Impossible de récupérer l'ID utilisateur: {}", e.getMessage());
        }
        return 1L;
    }
}