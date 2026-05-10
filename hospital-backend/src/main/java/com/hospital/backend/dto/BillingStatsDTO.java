package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO pour les statistiques de facturation du patient
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingStatsDTO {
    
    /** Montant total payé par le patient */
    private BigDecimal totalPaid;
    
    /** Montant total en attente de paiement */
    private BigDecimal totalPending;
    
    /** Montant total facturé (cumul) */
    private BigDecimal totalInvoiced;
    
    /** Nombre total de transactions */
    private Integer invoiceCount;
    
    /** Nombre de factures payées */
    private Integer paidCount;
    
    /** Nombre de factures en attente */
    private Integer pendingCount;
    
    /** Devise principale */
    private String currency;
    
    /** Dernière mise à jour des statistiques */
    private LocalDateTime lastUpdated;
}
