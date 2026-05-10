package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO complet pour les rapports de pharmacie
 * Contient toutes les données nécessaires pour les rapports ventes/stock/financier
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PharmacyReportDTO {
    
    // ═════════════════════════════════════════════════════════════════
    // RAPPORT VENTES
    // ═════════════════════════════════════════════════════════════════
    
    /** Évolution des ventes par période pour le graphique */
    private List<SalesEvolutionDTO> dailySales;
    
    /** Top produits vendus */
    private List<TopProductDTO> topProducts;
    
    /** Répartition des méthodes de paiement */
    private List<PaymentMethodDTO> paymentMethods;
    
    /** Statistiques globales des ventes */
    private SalesStatsDTO salesStats;
    
    // ═════════════════════════════════════════════════════════════════
    // RAPPORT STOCK
    // ═════════════════════════════════════════════════════════════════
    
    /** Métriques de stock */
    private StockMetricsDTO stockMetrics;
    
    /** Données de rotation des stocks pour le graphique */
    private List<StockRotationDTO> stockRotation;
    
    /** Alertes de stock détaillées */
    private List<MedicationStockAlertDTO> stockAlerts;
    
    // ═════════════════════════════════════════════════════════════════
    // RAPPORT FINANCIER
    // ═════════════════════════════════════════════════════════════════
    
    /** Analyse financière par période */
    private List<FinancialPeriodDTO> financialPeriods;
    
    /** Résumé financier global */
    private FinancialSummaryDTO financialSummary;
    
    // ═════════════════════════════════════════════════════════════════
    // DTOs internes
    // ═════════════════════════════════════════════════════════════════
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SalesStatsDTO {
        private BigDecimal totalSales;
        private Long totalOrders;
        private BigDecimal averageOrderValue;
        private Long totalItems;
        private Long uniqueProducts;
        private String bestSellingProduct;
        private Long bestSellingQuantity;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockMetricsDTO {
        private BigDecimal stockValuation;
        private Long totalItems;
        private Long alertsCount;
        private String averageRotation;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockRotationDTO {
        private String product;
        private String rotation;
        private Long stock;
        private Long min;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FinancialSummaryDTO {
        private BigDecimal totalRevenue;
        private BigDecimal totalExpenses;
        private BigDecimal totalProfit;
        private Double profitMargin;
        private BigDecimal averageCart;
    }
}
