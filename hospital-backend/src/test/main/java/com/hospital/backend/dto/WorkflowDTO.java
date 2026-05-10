package com.hospital.backend.dto;

import com.hospital.backend.entity.DocumentType;
import com.hospital.backend.entity.WorkflowStatus;
import com.hospital.backend.entity.WorkflowStep;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowDTO {
    private Long id;
    private String workflowCode;
    
    private Long patientId;
    private String patientName;
    
    private Long consultationId;
    private DocumentType documentType;
    private WorkflowStep currentStep;
    private WorkflowStatus status;
    
    private Long currentHandlerId;
    private String currentHandlerName;
    
    private Long referenceId;
    private String notes;
    
    private List<WorkflowHistoryDTO> history;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
