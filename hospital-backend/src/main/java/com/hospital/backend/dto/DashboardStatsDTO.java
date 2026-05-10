package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsDTO {
    // Finance fields
    private BigDecimal dailyRevenue;
    private BigDecimal monthlyRevenue;
    private Long pendingInvoices;
    private Long invoicesGenerated;
    private BigDecimal totalCollected;
    private BigDecimal totalExpenses;
    private Long todayPayments;
    
    // Reception fields (French)
    private Long admissionsJour;
    private Long enAttente;
    private Long fichesTransmises;
    private Long terminees;
    private Double todayRevenue;
    
    // Nested DTO for recent consultations
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RecentConsultationDTO {
        private Long id;
        private String patientName;
        private String serviceName;
        private String arrivalTime;
        private String status;
        private String statusLabel;
    }
    
    private List<RecentConsultationDTO> recentConsultations;
}

