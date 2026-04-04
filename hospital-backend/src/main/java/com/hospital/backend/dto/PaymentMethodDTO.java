package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO pour la répartition des méthodes de paiement
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentMethodDTO {
    private String name;          // Nom du mode (Espèces, Carte, etc.)
    private BigDecimal amount;    // Montant total
    private Integer value;          // Pourcentage
    private String color;           // Couleur pour le graphique
    private Long count;             // Nombre de transactions
}
