package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinaliserConsultationRequest {
    
    private Long patientId;
    private String diagnosticFinal;
    private String notes;
    private List<PrescriptionItemDTO> items;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrescriptionItemDTO {
        private Long medicationId;
        private String medicationName;
        private String dosage;
        private String frequency;
        private String duration;
        private Integer quantityPerDose;
        private String instructions;
        private Boolean active;
    }
}
