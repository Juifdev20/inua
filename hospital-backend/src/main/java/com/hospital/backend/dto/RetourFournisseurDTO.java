package com.hospital.backend.dto;

import com.hospital.backend.entity.Currency;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO pour le retour de médicaments au fournisseur
 * Déclenche la création automatique d'un avoir
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RetourFournisseurDTO {

    private Long commandeOriginaleId;
    private Long medicamentId;
    private Integer quantite;
    private BigDecimal montantRemboursement;
    private Currency devise;
    private String numeroBonRetour;
    private String motif;
    private Long fournisseurId;
}
