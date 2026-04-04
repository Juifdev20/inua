package com.hospital.backend.dto;

import com.hospital.backend.entity.LabTestStatus;
import com.hospital.backend.entity.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabTestDTO {
    private Long id;
    private String testCode;
    
    @NotNull(message = "La consultation est obligatoire")
    private Long consultationId;
    
    @NotNull(message = "Le patient est obligatoire")
    private Long patientId;
    private String patientName;
    
    private Long requestedById;
    private String requestedByName;
    
    private Long processedById;
    private String processedByName;
    
    @NotBlank(message = "Le type de test est obligatoire")
    private String testType;
    
    @NotBlank(message = "Le nom du test est obligatoire")
    private String testName;
    
    private String description;
    private String results;
    private String interpretation;
    private String normalRange;
    private LabTestStatus status;
    private Priority priority;
    private LocalDateTime requestedAt;
    private LocalDateTime processedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
