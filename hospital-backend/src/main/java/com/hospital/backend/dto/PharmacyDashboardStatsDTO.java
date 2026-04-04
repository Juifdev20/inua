package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PharmacyDashboardStatsDTO {
    private Long pendingPrescriptions;
    private Long todayRevenue;
    private Long lowStockAlerts;
    private Long totalOrdersToday;
    private Long totalOrdersThisMonth;
    private BigDecimal todaySalesAmount;
    private BigDecimal monthlySalesAmount;
    private Long unpaidOrders;
    private Long readyForDispensation;
    private Long expiredMedications;
    
    // Additional metrics
    private List<TopMedicationDTO> topMedications;
    private List<RecentOrderDTO> recentOrders;
    private List<StockAlertDTO> stockAlerts;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopMedicationDTO {
        private Long medicationId;
        private String medicationName;
        private String medicationCode;
        private Long totalSold;
        private BigDecimal totalRevenue;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentOrderDTO {
        private Long orderId;
        private String orderCode;
        private String patientName;
        private String status;
        private BigDecimal totalAmount;
        private LocalDateTime createdAt;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockAlertDTO {
        private Long medicationId;
        private String medicationName;
        private String medicationCode;
        private Integer currentStock;
        private Integer minimumStock;
        private String alertLevel; // LOW, CRITICAL, OUT_OF_STOCK
    }
}
