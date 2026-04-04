package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinanceDashboardStatsDTO {
    private BigDecimal dailyRevenue;
    private BigDecimal monthlyRevenue;
    private Long pendingInvoices;
    private BigDecimal totalExpenses;
    private Long todayPayments;
    private BigDecimal totalCollected;
}

