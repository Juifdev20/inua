package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Statistiques d'une entreprise pour le dashboard abonnés.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyStatsDTO {

    private Long companyId;
    private String companyName;
    private Long totalEmployees;
    private Long activeEmployees;
    private Long totalAdmissionsCurrentMonth;
    private BigDecimal totalCompanyCoverageCurrentMonth;
    private BigDecimal totalPatientSurplusCurrentMonth;
    private BigDecimal totalCompanyCoverageAllTime;
    private BigDecimal totalPatientSurplusAllTime;
}
