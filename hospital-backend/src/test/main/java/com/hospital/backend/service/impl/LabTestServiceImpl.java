package com.hospital.backend.service.impl;

import com.hospital.backend.dto.LabTestDTO;
import com.hospital.backend.dto.PageResponse;
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
import java.util.stream.Collectors;

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
    public List<LabTestDTO> getPendingTests() {
        return labTestRepository.findPendingTests().stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
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
            .status(l.getStatus())
            .priority(l.getPriority())
            .requestedAt(l.getRequestedAt())
            .processedAt(l.getProcessedAt())
            .createdAt(l.getCreatedAt())
            .updatedAt(l.getUpdatedAt());
        
        if (l.getRequestedBy() != null) {
            builder.requestedById(l.getRequestedBy().getId())
                .requestedByName(l.getRequestedBy().getFirstName() + " " + l.getRequestedBy().getLastName());
        }
        
        if (l.getProcessedBy() != null) {
            builder.processedById(l.getProcessedBy().getId())
                .processedByName(l.getProcessedBy().getFirstName() + " " + l.getProcessedBy().getLastName());
        }
        
        return builder.build();
    }
    
    private PageResponse<LabTestDTO> toPageResponse(Page<LabTest> page) {
        return PageResponse.<LabTestDTO>builder()
            .content(page.getContent().stream().map(this::mapToDTO).toList())
            .page(page.getNumber())
            .size(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .first(page.isFirst())
            .last(page.isLast())
            .build();
    }
}
