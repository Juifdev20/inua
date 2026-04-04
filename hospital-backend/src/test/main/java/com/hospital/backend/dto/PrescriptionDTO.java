package com.hospital.backend.dto;

import com.hospital.backend.entity.PrescriptionStatus;
import jakarta.validation.constraints.NotNull;
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
public class PrescriptionDTO {
    private Long id;
    private String prescriptionCode;
    
    @NotNull(message = "La consultation est obligatoire")
    private Long consultationId;
    
    @NotNull(message = "Le patient est obligatoire")
    private Long patientId;
    private String patientName;
    
    @NotNull(message = "Le médecin est obligatoire")
    private Long doctorId;
    private String doctorName;
    
    private List<PrescriptionItemDTO> items;
    private String notes;
    private PrescriptionStatus status;
    
    private Long dispensedById;
    private String dispensedByName;
    private LocalDateTime dispensedAt;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
