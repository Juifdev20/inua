package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

/**
 * DTO pour le réapprovisionnement prédictif
 * Contient toutes les données nécessaires pour calculer les quantités à commander
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PharmacyPredictionDTO {
    
    // Informations du médicament
    private Long medicationId;
    private String medicationName;
    private String medicationCode;
    private String supplier;
    private String category;
    
    // Données de stock
    private Integer currentStock;
    private Integer minimumStock;
    
    // Calculs de consommation
    private Double cmm; // Consommation Moyenne Mensuelle
    private Integer monthsToCover;
    private Integer suggestedQuantity; // Quantité suggérée à commander
    
    // Données financières
    private BigDecimal unitPurchasePrice;
    private BigDecimal estimatedSubtotal; // suggestedQuantity * unitPurchasePrice
    
    // Statut
    private PredictionStatus status;
    private String statusLabel;
    
    /**
     * Statuts possibles pour la prédiction
     */
    public enum PredictionStatus {
        RUPTURE_IMMINENTE,  // Stock critique, rupture probable
        STOCK_FAIBLE,       // Stock bas, réapprovisionnement recommandé
        STOCK_DORMANT,      // Aucune consommation (CMM = 0)
        STOCK_OK            // Stock suffisant
    }
}
