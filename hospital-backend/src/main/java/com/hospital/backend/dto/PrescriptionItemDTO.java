package com.hospital.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionItemDTO {
    private Long id;
    
    @NotNull(message = "Le médicament est obligatoire")
    private Long medicationId;
    private String medicationName;
    private String medicationCode;
    
    private Integer quantity;
    private String dosage;
    private String frequency;
    private Integer duration;
    private String durationUnit;
    private String instructions;
    private Boolean isDispensed;
    private Integer dispensedQuantity;
    
    // Manual getter for IDE compatibility
    public String getFrequency() {
        return frequency;
    }
}
