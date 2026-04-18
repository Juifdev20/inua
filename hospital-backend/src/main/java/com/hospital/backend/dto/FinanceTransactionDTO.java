package com.hospital.backend.dto;

import com.hospital.backend.entity.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO complet pour l'affichage d'une transaction Finance
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinanceTransactionDTO {

    private Long id;
    private TransactionType type;
    private TransactionStatus status;
    private PaiementMode paiementMode;
    private BigDecimal montant;
    private Currency devise;
    private BigDecimal tauxChange;
    private String categorie;
    private String referenceFournisseur;
    private String scanFactureUrl;
    private Long commandePharmacieId;
    private LocalDate dateFactureFournisseur;
    private LocalDate dateEcheancePaiement;
    private LocalDateTime dateDecaissement;
    private Long caisseId;
    private String caisseNom;
    private String validatedByName;
    private LocalDateTime dateValidation;
    private String createdByName;
    private Long transactionOriginaleId;
    private Long transactionCorrectriceId;
    private String motifCorrection;
    private Boolean immutable;
    private String fournisseurNom;
    private String numeroLivraison;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
