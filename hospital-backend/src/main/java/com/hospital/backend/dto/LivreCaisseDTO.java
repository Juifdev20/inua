package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO pour le Livre de Caisse (Cash Book)
 * Représente les entrées et sorties avec solde cumulatif
 */
public class LivreCaisseDTO {

    /**
     * Vue Synthétique - Totaux par jour
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SyntheseJournaliere {
        private LocalDate date;
        private BigDecimal entreeUSD;
        private BigDecimal sortieUSD;
        private BigDecimal soldeUSD;
        private BigDecimal entreeCDF;
        private BigDecimal sortieCDF;
        private BigDecimal soldeCDF;
        private int nombreTransactions;
    }

    /**
     * Vue Détaillée - Transaction par transaction
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DetailTransaction {
        private Long id;
        private LocalDateTime date;
        private String heure; // Format HH:mm
        private String type; // "ENTREE" ou "SORTIE"
        private String description;
        private String document; // Numéro de facture ou reçu
        private String devise;
        private BigDecimal montant;
        private BigDecimal soldeApres;
        
        // Informations Patient/Fournisseur
        private String patientNom;
        private String patientPrenom;
        private String patientCode;
        
        // Informations Caissier (Elève/Autorité)
        private Long caissierId;
        private String caissierNom;
        
        // Informations Médecin/Responsable
        private String medecinNom;
        
        // Source/Département
        private String source; // PHARMACIE, LABORATOIRE, CONSULTATION, etc.
    }

    /**
     * Totaux pour une période
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TotauxPeriode {
        private BigDecimal totalEntreesUSD;
        private BigDecimal totalSortiesUSD;
        private BigDecimal soldeFinalUSD;
        private BigDecimal totalEntreesCDF;
        private BigDecimal totalSortiesCDF;
        private BigDecimal soldeFinalCDF;
        private LocalDate dateDebut;
        private LocalDate dateFin;
    }

    /**
     * Réponse pour la vue Synthèse
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SyntheseResponse {
        private List<SyntheseJournaliere> journal;
        private TotauxPeriode totaux;
        private BigDecimal soldeOuvertureUSD;
        private BigDecimal soldeOuvertureCDF;
    }

    /**
     * Réponse pour la vue Détaillée
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DetailsResponse {
        private List<DetailTransaction> transactions;
        private TotauxPeriode totaux;
        private int page;
        private int size;
        private long totalElements;
    }
}
