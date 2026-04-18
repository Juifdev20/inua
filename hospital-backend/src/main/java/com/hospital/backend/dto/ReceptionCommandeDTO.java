package com.hospital.backend.dto;

import com.hospital.backend.entity.Currency;
import com.hospital.backend.entity.PaiementMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO pour la réception d'une commande fournisseur (entrée Pharmacie)
 * Déclenche la création automatique d'une transaction Finance
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceptionCommandeDTO {

    private Long commandeId;
    private String numeroFactureFournisseur;
    private LocalDate dateFactureFournisseur;
    private BigDecimal total;
    private Currency devise;
    private PaiementMode paiementMode;
    private Long fournisseurId;
    private String fournisseurNom;
    private String numeroLivraison;
    private LocalDate dateEcheancePaiement;
}
