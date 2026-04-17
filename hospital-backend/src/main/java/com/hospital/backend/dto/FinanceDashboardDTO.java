package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * DTO complet pour le tableau de bord financier
 * Affiche les statistiques séparées par devise (CDF et USD)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinanceDashboardDTO {

    // ═══════════════════════════════════════════════════════════════
    // REVENUS PAR DEVISE
    // ═══════════════════════════════════════════════════════════════

    private CurrencyStats dailyRevenue;
    private CurrencyStats monthlyRevenue;
    private CurrencyStats totalRevenue;

    // ═══════════════════════════════════════════════════════════════
    // DÉPENSES PAR DEVISE
    // ═══════════════════════════════════════════════════════════════

    private CurrencyStats dailyExpenses;
    private CurrencyStats monthlyExpenses;
    private CurrencyStats totalExpenses;

    // ═══════════════════════════════════════════════════════════════
    // SOLDE NET (Revenus - Dépenses)
    // ═══════════════════════════════════════════════════════════════

    private CurrencyStats netBalance;

    // ═══════════════════════════════════════════════════════════════
    // STATISTIQUES COMPLÉMENTAIRES
    // ═══════════════════════════════════════════════════════════════

    private Long pendingInvoicesCount;
    private Long totalInvoicesGenerated;
    private Long totalRevenuesCount;
    private Long totalExpensesCount;

    // ═══════════════════════════════════════════════════════════════
    // RÉPARTITION PAR SOURCE (Revenus)
    // ═══════════════════════════════════════════════════════════════

    private List<SourceStats> revenueBySource;

    // ═══════════════════════════════════════════════════════════════
    // RÉPARTITION PAR CATÉGORIE (Dépenses)
    // ═══════════════════════════════════════════════════════════════

    private List<CategoryStats> expensesByCategory;

    // ═══════════════════════════════════════════════════════════════
    // ÉVOLUTION MENSUELLE (6 derniers mois)
    // ═══════════════════════════════════════════════════════════════

    private List<MonthlyEvolution> revenueEvolutionCDF;
    private List<MonthlyEvolution> revenueEvolutionUSD;

    // ═══════════════════════════════════════════════════════════════
    // TRANSACTIONS RÉCENTES
    // ═══════════════════════════════════════════════════════════════

    private List<RecentTransaction> recentTransactions;

    // ═══════════════════════════════════════════════════════════════
    // CLASSES EMBARQUÉES
    // ═══════════════════════════════════════════════════════════════

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CurrencyStats {
        private BigDecimal cdf;
        private BigDecimal usd;

        public static CurrencyStats zero() {
            return new CurrencyStats(BigDecimal.ZERO, BigDecimal.ZERO);
        }

        public static CurrencyStats of(BigDecimal cdf, BigDecimal usd) {
            return new CurrencyStats(
                cdf != null ? cdf : BigDecimal.ZERO,
                usd != null ? usd : BigDecimal.ZERO
            );
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SourceStats {
        private String source;
        private CurrencyStats amount;
        private Long count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CategoryStats {
        private String category;
        private CurrencyStats amount;
        private Long count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MonthlyEvolution {
        private String month;
        private String year;
        private BigDecimal amount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RecentTransaction {
        private Long id;
        private String type; // "REVENUE" ou "EXPENSE"
        private String description;
        private BigDecimal amount;
        private String currency;
        private String date;        // Formatted: dd/MM/yyyy HH:mm
        private String createdAt;   // ISO format for frontend parsing
        private String status;
        private String patientName;
        private Long invoiceId;     // ID of linked invoice for navigation
    }
}
