package com.hospital.backend.dto;

import com.hospital.backend.entity.WorkflowStep;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowHistoryDTO {
    private Long id;
    private Long workflowId;
    private WorkflowStep fromStep;
    private WorkflowStep toStep;
    
    private Long actionById;
    private String actionByName;
    
    private String action;
    private String notes;
    private LocalDateTime createdAt;
}
