package com.hospital.backend.service.impl;

import com.hospital.backend.dto.ConsultationDTO;
import com.hospital.backend.dto.DecisionRequest;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.ConsultationService;
import com.hospital.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Year;
import java.util.List;
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

    private final Object ficheNumberLock = new Object();

    private String generateFicheNumber() {
        int currentYear = Year.now().getValue();

        synchronized (ficheNumberLock) {
            String nextCode;
            int attempts = 0;
            final int maxAttempts = 100;

            do {
                // Utilise un random + sequence pour éviter les collisions
                int random = (int) (Math.random() * 9000) + 1000;
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
     * ✅ HISTORIQUE FILTRÉ : Uniquement les états terminaux ou annulés.
     */
    @Override
    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public PageResponse<ConsultationDTO> getDoctorHistory(Long doctorId, Pageable pageable) {
        log.info("Récupération de l'historique filtré pour le docteur ID: {}", doctorId);

        List<ConsultationStatus> historyStatuses = List.of(
                ConsultationStatus.COMPLETED,
                ConsultationStatus.CANCELLED,
                ConsultationStatus.ARCHIVED
        );

        Page<Consultation> page = consultationRepository.findByDoctorIdAndStatusIn(
                doctorId,
                historyStatuses,
                pageable
        );

        return toPageResponse(page);
    }

    /**
     * ✅ AGENDA : Récupère les rendez-vous pour une journée spécifique.
     */
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

    /**
     * ✅ ARCHIVAGE : Rend le bouton "Archiver" du Dashboard fonctionnel.
     */
    @Override
    @Transactional
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ConsultationDTO archiveConsultation(Long id) {
        log.info("Archivage de la consultation ID: {}", id);
        Consultation consultation = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));

        consultation.setStatus(ConsultationStatus.ARCHIVED);
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
        consultation.setStatus(ConsultationStatus.CONFIRMED);
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
        } catch (Exception e) { log.error("Erreur notification: {}", e.getMessage()); }

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
        } catch (Exception e) { log.error(e.getMessage()); }

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

        consultation.setStatus(ConsultationStatus.EN_COURS);
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

    @Override @Transactional(readOnly = true)
    public ConsultationDTO getById(Long id) {
        return consultationRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation introuvable"));
    }

    @Override @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_PATIENT', 'ROLE_DOCTEUR')")
    public void delete(Long id) {
        consultationRepository.deleteById(id);
    }

    private ConsultationDTO mapToDTO(Consultation c) {
        if (c == null) return null;
        ConsultationDTO dto = ConsultationDTO.builder()
                .id(c.getId())
                .consultationCode(c.getConsultationCode())
                .patientId(c.getPatient() != null ? c.getPatient().getId() : null)
                .patientName(c.getPatient() != null ? c.getPatient().getFirstName() + " " + c.getPatient().getLastName() : "Inconnu")
                .status(c.getStatus())
                .decisionNote(c.getDecisionNote())
                .proposedNewDate(c.getProposedNewDate())
                .consultationDate(c.getConsultationDate())
                .reasonForVisit(c.getReasonForVisit())
                .diagnosis(c.getDiagnosis())
                .treatment(c.getTreatment())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();

        if (c.getDoctor() != null) {
            dto.setDoctorId(c.getDoctor().getId());
            dto.setDoctorName(c.getDoctor().getFirstName() + " " + c.getDoctor().getLastName());
            if (c.getDoctor().getDepartment() != null) {
                dto.setDepartmentName(c.getDoctor().getDepartment().getNom());
            }
        }
        return dto;
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

    @Override @Transactional(readOnly = true)
    public PageResponse<ConsultationDTO> getAll(Pageable pageable) { return toPageResponse(consultationRepository.findAll(pageable)); }

    @Override @Transactional(readOnly = true)
    public PageResponse<ConsultationDTO> getByStatus(ConsultationStatus status, Pageable pageable) { return toPageResponse(consultationRepository.findByStatus(status, pageable)); }

    @Override @Transactional(readOnly = true)
    public PageResponse<ConsultationDTO> getByPatient(Long patientId, Pageable pageable) { return toPageResponse(consultationRepository.findByPatientId(patientId, pageable)); }

    @Override @Transactional(readOnly = true)
    public PageResponse<ConsultationDTO> getByDoctor(Long doctorId, Pageable pageable) { return toPageResponse(consultationRepository.findByDoctorId(doctorId, pageable)); }

    @Override @Transactional public ConsultationDTO updateStatus(Long id, ConsultationStatus status) {
        Consultation c = consultationRepository.findById(id).orElseThrow();
        c.setStatus(status);
        return mapToDTO(consultationRepository.save(c));
    }

    // --- STUBS ---
    @Override @Transactional public ConsultationDTO create(ConsultationDTO dto) { return null; }
    @Override @Transactional public ConsultationDTO update(Long id, ConsultationDTO dto) { return null; }
    @Override @Transactional public ConsultationDTO getByCode(String code) { return null; }
    @Override @Transactional public ConsultationDTO sendToLab(Long id) { return null; }
    @Override @Transactional public ConsultationDTO sendToPharmacy(Long id) { return null; }
}