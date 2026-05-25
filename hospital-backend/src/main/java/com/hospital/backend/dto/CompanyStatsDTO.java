package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.hospital.backend.entity.SubscriptionStatus;
import java.math.BigDecimal;

/**
 * Statistiques d'une entreprise pour le dashboard abonnés.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyStatsDTO {

    // Identité
    private Long id;
    private String name;
    private String contactPerson;
    private SubscriptionStatus subscriptionStatus;
    private BigDecimal coverageRate;

    // Employés
    private Long employeeCount;
    private Long activeEmployeeCount;

    // Admissions mois courant
    private Long admissionCount;
    private BigDecimal totalCompanyCoverage;
    private BigDecimal totalPatientSurplus;

    // Totaux historiques
    private BigDecimal totalCompanyCoverageAllTime;
    private BigDecimal totalPatientSurplusAllTime;

    // Champs legacy (compatibilité)
    private Long companyId;
    private String companyName;
    private Long totalEmployees;
    private Long activeEmployees;
    private Long totalAdmissionsCurrentMonth;
    private BigDecimal totalCompanyCoverageCurrentMonth;
    private BigDecimal totalPatientSurplusCurrentMonth;
}
