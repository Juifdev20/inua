package com.hospital.backend.service;

import com.hospital.backend.dto.WorkflowDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.entity.DocumentType;
import com.hospital.backend.entity.WorkflowStep;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface WorkflowService {
    WorkflowDTO create(Long patientId, Long consultationId, DocumentType type);
    WorkflowDTO getById(Long id);
    WorkflowDTO getByCode(String code);
    PageResponse<WorkflowDTO> getAll(Pageable pageable);
    PageResponse<WorkflowDTO> getByPatient(Long patientId, Pageable pageable);
    List<WorkflowDTO> getActiveByHandler(Long handlerId);
    List<WorkflowDTO> getActiveByStep(WorkflowStep step);
    WorkflowDTO moveToNextStep(Long id, Long handlerId, String notes);
    WorkflowDTO assignHandler(Long id, Long handlerId);
    WorkflowDTO cancel(Long id, String reason);
    WorkflowDTO complete(Long id);
}
