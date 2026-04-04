package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicationStockAlertDTO {
    private Long medicationId;
    private String medicationCode;
    private String medicationName;
    private String genericName;
    private Integer currentStock;
    private Integer minimumStock;
    private Integer optimalStock;
    private String alertLevel; // LOW, CRITICAL, OUT_OF_STOCK
    private LocalDateTime lastUpdated;
    private Boolean isActive;
    
    // Computed fields
    private Integer deficit;
    private Double percentageRemaining;
    private String recommendedAction;
}
