package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entité centrale pour la synchronisation Pharmacie-Finance
 * Représente une transaction comptable générée automatiquement depuis la pharmacie
 * ou manuellement pour les corrections (avoirs)
 */
@Entity
@Table(name = "finance_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"validatedBy", "createdBy", "caisse"})
@EqualsAndHashCode(exclude = {"validatedBy", "createdBy", "caisse"})
public class FinanceTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "paiement_mode")
    private PaiementMode paiementMode;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal montant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Currency devise;

    @Column(name = "taux_change", precision = 19, scale = 6)
    private BigDecimal tauxChange;

    @Column(name = "categorie", nullable = false, length = 100)
    private String categorie;

    @Column(name = "reference_fournisseur", length = 100)
    private String referenceFournisseur;

    @Column(name = "scan_facture_url", length = 500)
    private String scanFactureUrl;

    @Column(name = "commande_pharmacie_id")
    private Long commandePharmacieId;

    @Column(name = "date_facture_fournisseur")
    private LocalDate dateFactureFournisseur;

    @Column(name = "date_echeance_paiement")
    private LocalDate dateEcheancePaiement;

    @Column(name = "date_decaissement")
    private LocalDateTime dateDecaissement;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "caisse_id")
    @JsonIgnore
    private Caisse caisse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "validated_by")
    @JsonIgnore
    private User validatedBy;

    @Column(name = "date_validation")
    private LocalDateTime dateValidation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnore
    private User createdBy;

    @Column(name = "transaction_originale_id")
    private Long transactionOriginaleId;

    @Column(name = "transaction_correctrice_id")
    private Long transactionCorrectriceId;

    @Column(name = "motif_correction", columnDefinition = "TEXT")
    private String motifCorrection;

    @Column(name = "immutable", nullable = false)
    @Builder.Default
    private Boolean immutable = false;

    @Column(name = "fournisseur_id")
    private Long fournisseurId;

    @Column(name = "fournisseur_nom", length = 200)
    private String fournisseurNom;

    @Column(name = "numero_livraison", length = 50)
    private String numeroLivraison;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Vérifie si la transaction peut être modifiée
     * Une transaction immutable ne peut plus être altérée (validation, annulation)
     */
    public boolean canBeModified() {
        return !Boolean.TRUE.equals(immutable) && 
               status != TransactionStatus.CONTRE_PASSEE &&
               status != TransactionStatus.PAYE;
    }

    /**
     * Vérifie si la transaction est en attente de scan pour validation
     */
    public boolean isWaitingForScan() {
        return status == TransactionStatus.EN_ATTENTE_SCAN;
    }

    /**
     * Calcule le montant en valeur absolue (utile pour les avoirs négatifs)
     */
    public BigDecimal getMontantAbsolu() {
        return montant != null ? montant.abs() : BigDecimal.ZERO;
    }
}
