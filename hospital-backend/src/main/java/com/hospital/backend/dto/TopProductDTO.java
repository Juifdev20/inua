package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO pour les top produits vendus
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopProductDTO {
    private String name;          // Nom du produit
    private Integer quantity;     // Quantité vendue
    private BigDecimal revenue;   // Revenus générés
    private Long medicationId;    // ID du médicament
}
