package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO pour l'analyse financière (revenus, dépenses, bénéfices)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialPeriodDTO {
    private String month;           // Période (Jan, Fév, etc.)
    private BigDecimal revenue;     // Revenus
    private BigDecimal expenses;    // Dépenses
    private BigDecimal profit;      // Bénéfice
}
