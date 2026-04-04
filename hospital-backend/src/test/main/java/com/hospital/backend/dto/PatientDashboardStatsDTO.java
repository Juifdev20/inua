package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
public class PatientDashboardStatsDTO {
    private BigDecimal totalInvoiced; // Carte Bleue
    private BigDecimal totalPaid;     // Carte Verte
    private BigDecimal totalPending;  // Carte Orange
}