package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DTO DE FACTURATION PATIENT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Représente une ligne de facturation consolidée incluant:
 * - Factures (Invoice)
 * - Admissions (frais fiche + consultation)
 * - Commandes pharmacie (PharmacyOrder)
 * 
 * Ce DTO est utilisé pour l'affichage unifié de l'historique de paiement
 * dans l'espace patient.
 * 
 * @author Inua Afya Development Team
 * @version 1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingItemDTO {

    // ═════════════════════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═════════════════════════════════════════════════════════════════════════════
    
    /** Identifiant unique composite: INV-{id}, ADM-{id}, PHARMA-{id} */
    private String id;
    
    /** ID numérique original de l'entité (pour API interne) */
    private Long originalId;
    
    /** Numéro de référence lisible par l'utilisateur */
    private String referenceNumber;
    
    /** 
     * Type de transaction 
     * FICHE: Frais d'enregistrement patient
     * CONSULTATION: Frais de consultation médicale
     * PHARMACIE: Achat de médicaments
     * LABORATOIRE: Analyses et examens
     * AUTRE: Autres services
     */
    private BillingType type;
    
    /** Source du service: RECEPTION, PHARMACIE, LABORATOIRE, FINANCE */
    private String source;
    
    // ═════════════════════════════════════════════════════════════════════════════
    // DESCRIPTION
    // ═════════════════════════════════════════════════════════════════════════════
    
    /** Titre court de la transaction */
    private String title;
    
    /** Description détaillée */
    private String description;
    
    /** Liste des items détaillés (médicaments, actes, etc.) */
    private List<BillingItemDetailDTO> items;
    
    // ═════════════════════════════════════════════════════════════════════════════
    // MONTANTS
    // ═════════════════════════════════════════════════════════════════════════════
    
    /** Montant total de la facture */
    private BigDecimal totalAmount;
    
    /** Montant déjà payé */
    private BigDecimal paidAmount;
    
    /** Solde restant à payer */
    private BigDecimal balance;
    
    /** Devise: CDF, USD */
    private String currency;
    
    // ═════════════════════════════════════════════════════════════════════════════
    // STATUT
    // ═════════════════════════════════════════════════════════════════════════════
    
    /** 
     * Statut de paiement
     * PAYEE: Paiement complet reçu
     * EN_ATTENTE: Aucun paiement reçu
     * PARTIEL: Paiement partiel
     * ANNULEE: Facture annulée
     */
    private PaymentStatus status;
    
    /** Indique si la facture est entièrement payée (helper pour UI) */
    private Boolean isPaid;
    
    /** Méthode de paiement utilisée: ESPECES, CARTE, MOBILE_MONEY, VIREMENT */
    private String paymentMethod;
    
    // ═════════════════════════════════════════════════════════════════════════════
    // CODE DE PAIEMENT (Pour présentation au guichet)
    // ═════════════════════════════════════════════════════════════════════════════
    
    /** 
     * Code de paiement unique généré pour les factures en attente.
     * Format: P-XXXXXX (6 caractères)
     * Le patient présente ce code au guichet finance pour paiement rapide.
     */
    private String paymentCode;
    
    // ═════════════════════════════════════════════════════════════════════════════
    // MÉTADONNÉES
    // ═════════════════════════════════════════════════════════════════════════════
    
    /** Date de création de la facture */
    private LocalDateTime createdAt;
    
    /** Date de dernière mise à jour */
    private LocalDateTime updatedAt;
    
    /** Date de paiement complet (null si non payée) */
    private LocalDateTime paidAt;
    
    // ═════════════════════════════════════════════════════════════════════════════
    // PATIENT
    // ═════════════════════════════════════════════════════════════════════════════
    
    /** ID du patient */
    private Long patientId;
    
    /** Nom complet du patient */
    private String patientName;
    
    // ═════════════════════════════════════════════════════════════════════════════
    // SOUS-DTO POUR LES DÉTAILS D'ITEM
    // ═════════════════════════════════════════════════════════════════════════════
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BillingItemDetailDTO {
        private Long id;
        private String description;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
        /** Instructions spéciales (posologie pour médicaments) */
        private String instructions;
    }
    
    // ═════════════════════════════════════════════════════════════════════════════
    // ÉNUMÉRATIONS
    // ═════════════════════════════════════════════════════════════════════════════
    
    public enum BillingType {
        FICHE,          // Frais d'enregistrement
        CONSULTATION,   // Frais de consultation
        PHARMACIE,      // Médicaments
        LABORATOIRE,    // Analyses
        AUTRE           // Autres services
    }
    
    public enum PaymentStatus {
        PAYEE,          // ✅ Payé
        EN_ATTENTE,     // ⏳ En attente
        PARTIEL,        // 💳 Partiellement payé
        ANNULEE         // ❌ Annulé
    }
}
