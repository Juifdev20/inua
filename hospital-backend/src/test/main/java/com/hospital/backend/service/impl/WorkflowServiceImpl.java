package com.hospital.backend.service.impl;

import com.hospital.backend.dto.WorkflowDTO;
import com.hospital.backend.dto.WorkflowHistoryDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.BadRequestException;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowServiceImpl implements WorkflowService {
    
    private final DocumentWorkflowRepository workflowRepository;
    private final WorkflowHistoryRepository historyRepository;
    private final PatientRepository patientRepository;
    private final ConsultationRepository consultationRepository;
    private final UserRepository userRepository;
    
    @Override
    @Transactional
    public WorkflowDTO create(Long patientId, Long consultationId, DocumentType type) {
        log.info("Création d'un nouveau workflow pour le patient ID: {}", patientId);
        
        Patient patient = patientRepository.findById(patientId)
            .orElseThrow(() -> new ResourceNotFoundException("Patient non trouvé"));
        
        Consultation consultation = null;
        if (consultationId != null) {
            consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation non trouvée"));
        }
        
        DocumentWorkflow workflow = DocumentWorkflow.builder()
            .patient(patient)
            .consultation(consultation)
            .documentType(type)
            .currentStep(WorkflowStep.RECEPTION)
            .status(WorkflowStatus.EN_COURS)
            .build();
        
        workflow = workflowRepository.save(workflow);
        
        // Créer l'historique initial
        WorkflowHistory history = WorkflowHistory.builder()
            .workflow(workflow)
            .toStep(WorkflowStep.RECEPTION)
            .action("Création du workflow")
            .build();
        historyRepository.save(history);
        
        log.info("Workflow créé avec le code: {}", workflow.getWorkflowCode());
        return mapToDTO(workflow);
    }
    
    @Override
    public WorkflowDTO getById(Long id) {
        DocumentWorkflow workflow = workflowRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Workflow non trouvé"));
        return mapToDTO(workflow);
    }
    
    @Override
    public WorkflowDTO getByCode(String code) {
        DocumentWorkflow workflow = workflowRepository.findByWorkflowCode(code)
            .orElseThrow(() -> new ResourceNotFoundException("Workflow non trouvé"));
        return mapToDTO(workflow);
    }
    
    @Override
    public PageResponse<WorkflowDTO> getAll(Pageable pageable) {
        Page<DocumentWorkflow> page = workflowRepository.findAll(pageable);
        return toPageResponse(page);
    }
    
    @Override
    public PageResponse<WorkflowDTO> getByPatient(Long patientId, Pageable pageable) {
        Page<DocumentWorkflow> page = workflowRepository.findByPatientId(patientId, pageable);
        return toPageResponse(page);
    }
    
    @Override
    public List<WorkflowDTO> getActiveByHandler(Long handlerId) {
        return workflowRepository.findActiveWorkflowsByHandler(handlerId).stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    @Override
    public List<WorkflowDTO> getActiveByStep(WorkflowStep step) {
        return workflowRepository.findActiveWorkflowsByStep(step).stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    @Override
    @Transactional
    public WorkflowDTO moveToNextStep(Long id, Long handlerId, String notes) {
        log.info("Passage à l'étape suivante pour le workflow ID: {}", id);
        
        DocumentWorkflow workflow = workflowRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Workflow non trouvé"));
        
        if (workflow.getStatus() != WorkflowStatus.EN_COURS) {
            throw new BadRequestException("Ce workflow n'est plus actif");
        }
        
        User handler = null;
        if (handlerId != null) {
            handler = userRepository.findById(handlerId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        }
        
        WorkflowStep currentStep = workflow.getCurrentStep();
        WorkflowStep nextStep = getNextStep(currentStep);
        
        if (nextStep == null) {
            throw new BadRequestException("Ce workflow est déjà à l'étape finale");
        }
        
        // Créer l'historique
        WorkflowHistory history = WorkflowHistory.builder()
            .workflow(workflow)
            .fromStep(currentStep)
            .toStep(nextStep)
            .actionBy(handler)
            .action("Passage à l'étape: " + nextStep.name())
            .notes(notes)
            .build();
        historyRepository.save(history);
        
        workflow.setCurrentStep(nextStep);
        workflow.setCurrentHandler(handler);
        if (nextStep == WorkflowStep.TERMINE) {
            workflow.setStatus(WorkflowStatus.TERMINE);
        }
        
        workflow = workflowRepository.save(workflow);
        return mapToDTO(workflow);
    }
    
    @Override
    @Transactional
    public WorkflowDTO assignHandler(Long id, Long handlerId) {
        log.info("Assignation du handler {} au workflow ID: {}", handlerId, id);
        
        DocumentWorkflow workflow = workflowRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Workflow non trouvé"));
        
        User handler = userRepository.findById(handlerId)
            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        
        workflow.setCurrentHandler(handler);
        workflow = workflowRepository.save(workflow);
        
        return mapToDTO(workflow);
    }
    
    @Override
    @Transactional
    public WorkflowDTO cancel(Long id, String reason) {
        log.info("Annulation du workflow ID: {}", id);
        
        DocumentWorkflow workflow = workflowRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Workflow non trouvé"));
        
        // Créer l'historique
        WorkflowHistory history = WorkflowHistory.builder()
            .workflow(workflow)
            .fromStep(workflow.getCurrentStep())
            .action("Annulation")
            .notes(reason)
            .build();
        historyRepository.save(history);
        
        workflow.setStatus(WorkflowStatus.ANNULE);
        workflow.setNotes(reason);
        workflow = workflowRepository.save(workflow);
        
        return mapToDTO(workflow);
    }
    
    @Override
    @Transactional
    public WorkflowDTO complete(Long id) {
        log.info("Finalisation du workflow ID: {}", id);
        
        DocumentWorkflow workflow = workflowRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Workflow non trouvé"));
        
        // Créer l'historique
        WorkflowHistory history = WorkflowHistory.builder()
            .workflow(workflow)
            .fromStep(workflow.getCurrentStep())
            .toStep(WorkflowStep.TERMINE)
            .action("Finalisation")
            .build();
        historyRepository.save(history);
        
        workflow.setCurrentStep(WorkflowStep.TERMINE);
        workflow.setStatus(WorkflowStatus.TERMINE);
        workflow = workflowRepository.save(workflow);
        
        return mapToDTO(workflow);
    }
    
    private WorkflowStep getNextStep(WorkflowStep current) {
        return switch (current) {
            case RECEPTION -> WorkflowStep.CONSULTATION;
            case CONSULTATION -> WorkflowStep.LABORATOIRE;
            case LABORATOIRE -> WorkflowStep.RETOUR_MEDECIN;
            case RETOUR_MEDECIN -> WorkflowStep.PHARMACIE;
            case PHARMACIE -> WorkflowStep.FINANCE;
            case FINANCE -> WorkflowStep.TERMINE;
            case TERMINE -> null;
        };
    }
    
    private WorkflowDTO mapToDTO(DocumentWorkflow w) {
        List<WorkflowHistory> historyList = historyRepository.findByWorkflowIdOrderByCreatedAtAsc(w.getId());
        List<WorkflowHistoryDTO> historyDTOs = historyList.stream()
            .map(this::mapHistoryToDTO)
            .collect(Collectors.toList());
        
        WorkflowDTO.WorkflowDTOBuilder builder = WorkflowDTO.builder()
            .id(w.getId())
            .workflowCode(w.getWorkflowCode())
            .patientId(w.getPatient().getId())
            .patientName(w.getPatient().getFirstName() + " " + w.getPatient().getLastName())
            .documentType(w.getDocumentType())
            .currentStep(w.getCurrentStep())
            .status(w.getStatus())
            .referenceId(w.getReferenceId())
            .notes(w.getNotes())
            .history(historyDTOs)
            .createdAt(w.getCreatedAt())
            .updatedAt(w.getUpdatedAt());
        
        if (w.getConsultation() != null) {
            builder.consultationId(w.getConsultation().getId());
        }
        
        if (w.getCurrentHandler() != null) {
            builder.currentHandlerId(w.getCurrentHandler().getId())
                .currentHandlerName(w.getCurrentHandler().getFirstName() + " " + w.getCurrentHandler().getLastName());
        }
        
        return builder.build();
    }
    
    private WorkflowHistoryDTO mapHistoryToDTO(WorkflowHistory h) {
        WorkflowHistoryDTO.WorkflowHistoryDTOBuilder builder = WorkflowHistoryDTO.builder()
            .id(h.getId())
            .workflowId(h.getWorkflow().getId())
            .fromStep(h.getFromStep())
            .toStep(h.getToStep())
            .action(h.getAction())
            .notes(h.getNotes())
            .createdAt(h.getCreatedAt());
        
        if (h.getActionBy() != null) {
            builder.actionById(h.getActionBy().getId())
                .actionByName(h.getActionBy().getFirstName() + " " + h.getActionBy().getLastName());
        }
        
        return builder.build();
    }
    
    private PageResponse<WorkflowDTO> toPageResponse(Page<DocumentWorkflow> page) {
        return PageResponse.<WorkflowDTO>builder()
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
