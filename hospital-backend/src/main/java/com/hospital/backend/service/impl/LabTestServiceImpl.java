package com.hospital.backend.service.impl;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.LabTestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.Arrays;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class LabTestServiceImpl implements LabTestService {

    private final LabTestRepository labTestRepository;
    private final ConsultationRepository consultationRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public LabTestDTO create(LabTestDTO dto) {
        log.info("Création d'un nouveau test de laboratoire pour le patient ID: {}", dto.getPatientId());

        Consultation consultation = consultationRepository.findById(dto.getConsultationId())
                .orElseThrow(() -> new ResourceNotFoundException("Consultation non trouvée"));

        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient non trouvé"));

        User requestedBy = null;
        if (dto.getRequestedById() != null) {
            requestedBy = userRepository.findById(dto.getRequestedById())
                    .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        }

        LabTest labTest = LabTest.builder()
                .consultation(consultation)
                .patient(patient)
                .requestedBy(requestedBy)
                .testType(dto.getTestType())
                .testName(dto.getTestName())
                .description(dto.getDescription())
                .priority(dto.getPriority() != null ? dto.getPriority() : Priority.NORMALE)
                .status(LabTestStatus.EN_ATTENTE)
                .fromFinance(dto.isFromFinance())
                .build();

        labTest = labTestRepository.save(labTest);
        log.info("Test de laboratoire créé avec le code: {}", labTest.getTestCode());

        return mapToDTO(labTest);
    }

    @Override
    @Transactional
    public LabTestDTO update(Long id, LabTestDTO dto) {
        log.info("Mise à jour du test de laboratoire ID: {}", id);

        LabTest labTest = labTestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Test de laboratoire non trouvé"));

        if (dto.getTestType() != null) labTest.setTestType(dto.getTestType());
        if (dto.getTestName() != null) labTest.setTestName(dto.getTestName());
        if (dto.getDescription() != null) labTest.setDescription(dto.getDescription());
        if (dto.getPriority() != null) labTest.setPriority(dto.getPriority());
        if (dto.getNormalRange() != null) labTest.setNormalRange(dto.getNormalRange());
        if (dto.getStatus() != null) labTest.setStatus(dto.getStatus());
        if (dto.getUnitPrice() != null) labTest.setUnitPrice(dto.getUnitPrice());

        labTest.setFromFinance(dto.isFromFinance());

        labTest = labTestRepository.save(labTest);
        return mapToDTO(labTest);
    }

    @Override
    public LabTestDTO getById(Long id) {
        LabTest labTest = labTestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Test de laboratoire non trouvé"));
        return mapToDTO(labTest);
    }

    @Override
    public LabTestDTO getByCode(String code) {
        LabTest labTest = labTestRepository.findByTestCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Test de laboratoire non trouvé"));
        return mapToDTO(labTest);
    }

    @Override
    public PageResponse<LabTestDTO> getAll(Pageable pageable) {
        Page<LabTest> page = labTestRepository.findAll(pageable);
        return toPageResponse(page);
    }

    @Override
    public PageResponse<LabTestDTO> getByPatient(Long patientId, Pageable pageable) {
        Page<LabTest> page = labTestRepository.findByPatientId(patientId, pageable);
        return toPageResponse(page);
    }

    @Override
    public PageResponse<LabTestDTO> getByConsultation(Long consultationId, Pageable pageable) {
        Page<LabTest> page = labTestRepository.findByConsultationId(consultationId, pageable);
        return toPageResponse(page);
    }

    @Override
    public PageResponse<LabTestDTO> getByStatus(LabTestStatus status, Pageable pageable) {
        Page<LabTest> page = labTestRepository.findByStatus(status, pageable);
        return toPageResponse(page);
    }

    @Override
    public PageResponse<LabTestDTO> getPendingTests(Pageable pageable) {
        Page<LabTest> page = labTestRepository.findByStatus(LabTestStatus.EN_ATTENTE, pageable);
        return toPageResponse(page);
    }

    @Override
    @Transactional
    public LabTestDTO addToQueue(LabTestDTO dto) {
        log.info("🚀 [BACKEND] Création test Labo pour Consultation ID: {}", dto.getConsultationId());

        Consultation consultation = consultationRepository.findById(dto.getConsultationId())
                .orElseThrow(() -> new ResourceNotFoundException("Consultation ID " + dto.getConsultationId() + " non trouvée"));
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient ID " + dto.getPatientId() + " non trouvé"));

        LabTest labTest = LabTest.builder()
                .consultation(consultation)
                .patient(patient)
                .testType(dto.getTestType() != null ? dto.getTestType() : "LABORATOIRE")
                .testName(dto.getTestName())
                .description(dto.getDescription())
                .priority(dto.getPriority() != null ? dto.getPriority() : Priority.NORMALE)
                .status(LabTestStatus.EN_ATTENTE)
                .fromFinance(true)
                .unitPrice(dto.getUnitPrice())
                .build();

        LabTest saved = labTestRepository.save(labTest);
        log.info("✅ [BACKEND] LabTest créé ID: {} Code: {} fromFinance=true", saved.getId(), saved.getTestCode());
        return mapToDTO(saved);
    }

    @Override
    public PageResponse<LabTestDTO> getQueue(Pageable pageable) {
        Page<LabTest> page = labTestRepository.findByStatusAndFromFinance(LabTestStatus.EN_ATTENTE, true, pageable);
        return toPageResponse(page);
    }

    @Override
    @Transactional
    public LabTestDTO addResults(Long id, String results, String interpretation) {
        log.info("Ajout des résultats au test de laboratoire ID: {}", id);

        LabTest labTest = labTestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Test de laboratoire non trouvé"));

        labTest.setResults(results);
        labTest.setInterpretation(interpretation);
        labTest.setStatus(LabTestStatus.RESULTAT_DISPONIBLE);
        labTest.setProcessedAt(LocalDateTime.now());

        labTest = labTestRepository.save(labTest);
        return mapToDTO(labTest);
    }

    @Override
    @Transactional
    public LabTestDTO updateStatus(Long id, LabTestStatus status) {
        log.info("Mise à jour du statut du test de laboratoire ID: {} vers {}", id, status);

        LabTest labTest = labTestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Test de laboratoire non trouvé"));

        labTest.setStatus(status);
        if (status == LabTestStatus.TERMINE || status == LabTestStatus.RESULTAT_DISPONIBLE) {
            labTest.setProcessedAt(LocalDateTime.now());
        }

        labTest = labTestRepository.save(labTest);
        return mapToDTO(labTest);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Suppression du test de laboratoire ID: {}", id);
        LabTest labTest = labTestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Test de laboratoire non trouvé"));
        labTestRepository.delete(labTest);
    }

    // ✅ NOUVEAU : Récupère la liste des Docteurs pour la Modal Frontend
    @Override
    public List<UserDTO> getAvailableDoctors() {
        // Logique pour filtrer les utilisateurs par rôle 'ROLE_DOCTEUR'
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() != null && u.getRole().getNom().equals("ROLE_DOCTEUR"))
                .map(u -> UserDTO.builder()
                        .id(u.getId())
                        .firstName(u.getFirstName())
                        .lastName(u.getLastName())
                        .nom(u.getLastName()) // Ajout pour compatibilité avec le frontend
                        .prenom(u.getFirstName()) // Ajout pour compatibilité avec le frontend
                        .build())
                .collect(Collectors.toList());
    }

    // ✅ NOUVEAU : Envoie les résultats au médecin choisi
    @Override
    @Transactional
    public void sendResultsToDoctor(BatchResultRequest request) {
        log.info("🚀 [SERVICE] Envoi des résultats au Docteur ID: {}", request.getDoctorId());

        User doctor = userRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Médecin destinataire non trouvé"));

        for (Long testId : request.getTestIds()) {
            LabTest test = labTestRepository.findById(testId)
                    .orElseThrow(() -> new ResourceNotFoundException("Test " + testId + " introuvable"));

            // On enregistre les résultats (format JSON String)
            if (request.getResults() != null) {
                test.setResults(request.getResults().get(testId.toString()));
            }

            test.setInterpretation(request.getInterpretation());
            test.setDoctorRecipient(doctor); // On lie le médecin
            test.setStatus(LabTestStatus.TERMINE); // Passage en historique
            test.setProcessedAt(LocalDateTime.now());

            labTestRepository.save(test);
        }
    }

    // ✅ NOUVEAU : Pour les alertes du Docteur
    @Override
    public List<LabTestDTO> getResultsByDoctor(Long doctorId) {
        return labTestRepository.findByDoctorRecipientIdAndStatus(doctorId, LabTestStatus.TERMINE)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // ✅ NOUVEAU : Récupère tous les tests par médecin (sans filtre de statut pour plus de flexibilité)
    @Override
    public List<LabTestDTO> getTestsByDoctor(Long doctorId) {
        return labTestRepository.findByDoctorRecipientId(doctorId)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // ✅ NOUVEAU : Historique pour la consultation
    @Override
    public List<LabTestDTO> getFinishedResultsByPatient(Long patientId) {
        return labTestRepository.findFinishedTestsByPatient(patientId)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    public List<LabTestDTO> getActiveTestsForPatient(Long patientId) {
        List<LabTestStatus> allowedStatuses = Arrays.asList(LabTestStatus.EN_ATTENTE, LabTestStatus.EN_COURS);
        List<LabTest> tests = labTestRepository.findByPatientIdAndStatusIn(patientId, allowedStatuses);
        return tests.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    @Override
    public BatchSubmitResult submitBatchResults(BatchResultRequest request) {
        // Redirection vers la nouvelle logique d'envoi au médecin si un doctorId est présent
        if (request.getDoctorId() != null) {
            sendResultsToDoctor(request);
            return new BatchSubmitResult(request.getTestIds().size(), true);
        }

        int updated = 0;
        for (Long testId : request.getTestIds()) {
            LabTest test = labTestRepository.findById(testId)
                    .orElseThrow(() -> new ResourceNotFoundException("Test " + testId + " introuvable"));

            if (request.getResults() != null) {
                test.setResults(request.getResults().get(testId.toString()));
            }
            test.setInterpretation(request.getInterpretation());
            test.setStatus(LabTestStatus.RESULTAT_DISPONIBLE);
            test.setProcessedAt(LocalDateTime.now());

            labTestRepository.save(test);
            updated++;
        }
        return new BatchSubmitResult(updated, true);
    }

    private LabTestDTO mapToDTO(LabTest l) {
        LabTestDTO.LabTestDTOBuilder builder = LabTestDTO.builder()
                .id(l.getId())
                .testCode(l.getTestCode())
                .consultationId(l.getConsultation().getId())
                .patientId(l.getPatient().getId())
                .patientName(l.getPatient().getFirstName() + " " + l.getPatient().getLastName())
                .testType(l.getTestType())
                .testName(l.getTestName())
                .description(l.getDescription())
                .results(l.getResults())
                .interpretation(l.getInterpretation())
                .normalRange(l.getNormalRange())
                .unit(l.getUnit())
                .status(l.getStatus())
                .priority(l.getPriority())
                .requestedAt(l.getRequestedAt())
                .processedAt(l.getProcessedAt())
                .createdAt(l.getCreatedAt())
                .updatedAt(l.getUpdatedAt())
                .fromFinance(l.isFromFinance())
                .unitPrice(l.getUnitPrice());

        if (l.getRequestedBy() != null) {
            builder.requestedById(l.getRequestedBy().getId())
                    .requestedByName(l.getRequestedBy().getFirstName() + " " + l.getRequestedBy().getLastName());
        }

        if (l.getProcessedBy() != null) {
            builder.processedById(l.getProcessedBy().getId())
                    .processedByName(l.getProcessedBy().getFirstName() + " " + l.getProcessedBy().getLastName());
        }

        // ✅ Inclusion du Docteur Destinataire dans le DTO
        if (l.getDoctorRecipient() != null) {
            builder.doctorRecipientId(l.getDoctorRecipient().getId());
            builder.doctorRecipientName("Dr. " + l.getDoctorRecipient().getFirstName() + " " + l.getDoctorRecipient().getLastName());
        }

        return builder.build();
    }

    private PageResponse<LabTestDTO> toPageResponse(Page<LabTest> page) {
        return PageResponse.<LabTestDTO>builder()
                .content(page.getContent().stream().map(this::mapToDTO).collect(Collectors.toList()))
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .build();
    }
}