package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO complet pour le parcours patient (End-to-End)
 * Regroupe toutes les informations du passage : Triage, Labo, Prescription, Pharmacie, Finance
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientJourneyDTO {

    // --- INFORMATIONS GÉNÉRALES ---
    private Long consultationId;
    private String consultationCode;
    private LocalDateTime consultationDate;
    private LocalDateTime dischargeDate;
    private String status;
    private String doctorName;
    private String doctorSpecialty;

    // --- PATIENT ---
    private Long patientId;
    private String patientName;
    private String patientCode;
    private String patientPhone;
    private String patientAddress;
    private String patientAge;
    private String patientGender;

    // --- TRIAGE (Signes vitaux) ---
    private TriageInfoDTO triageInfo;

    // --- RÉSULTATS LABORATOIRE ---
    private List<LabResultDTO> labResults;
    private String labInterpretation;
    private LocalDateTime labCompletedDate;

    // --- PRESCRIPTION MÉDICALE ---
    private PrescriptionSummaryDTO prescription;

    // --- PHARMACIE (Prescrit vs Livré) ---
    private PharmacyStatusDTO pharmacyStatus;

    // --- FINANCE (Facturation) ---
    private BillingSummaryDTO billingSummary;

    // --- MÉTADONNÉES ---
    private LocalDateTime reportGeneratedAt;
    private String generatedBy;

    // --- VALIDATION ET SIGNATURE ---
    private String numeroFiche;
    private LocalDateTime dateValidation;
    private Long signataireId;
    private String signatureImage;
    private Boolean isValidated;

    /**
     * DTO pour les informations de triage
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TriageInfoDTO {
        private Double poids;
        private Double taille;
        private Double temperature;
        private String tensionArterielle;
        private Integer pouls;
        private Integer frequenceRespiratoire;
        private Integer saturationO2;
        private String glycemie;
        private String motifVisite;
        private String niveauUrgence;
        private LocalDateTime triageDate;
        private String triageBy;
    }

    /**
     * DTO pour un résultat de laboratoire
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LabResultDTO {
        private Long testId;
        private String testCode;
        private String testName;
        private String category;
        private String resultValue;
        private String unit;
        private String referenceRange;
        private String interpretation;
        private Boolean isCritical;
        private Boolean isAbnormal;
        private LocalDateTime resultDate;
        private String validatedBy;
    }

    /**
     * DTO pour le résumé de prescription
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrescriptionSummaryDTO {
        private Long prescriptionId;
        private String prescriptionCode;
        private String diagnosis;
        private String notes;
        private LocalDateTime prescriptionDate;
        private List<PrescriptionItemDTO> items;
    }

    /**
     * DTO pour un item de prescription
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrescriptionItemDTO {
        private Long medicationId;
        private String medicationName;
        private String genericName;
        private String dosage;
        private String frequency;
        private String duration;
        private Integer quantityPerDose;
        private String instructions;
        private Integer prescribedQuantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
    }

    /**
     * DTO pour le statut pharmacie (Prescrit vs Livré)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PharmacyStatusDTO {
        private Long dispensationId;
        private String dispensationCode;
        private LocalDateTime dispensationDate;
        private String pharmacistName;
        private String status; // EN_ATTENTE, PARTIELLEMENT_SERVI, COMPLETEMENT_SERVI, NON_SERVI
        private List<PharmacyItemDTO> items;
    }

    /**
     * DTO pour un item pharmacie (comparaison Prescrit vs Livré)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PharmacyItemDTO {
        private Long medicationId;
        private String medicationName;
        private Integer prescribedQty;
        private Integer deliveredQty;
        private Integer refusedQty;
        private String status; // SERVI, PARTIEL, NON_SERVI, REFUSE
        private String refusalReason;
        private Boolean isAvailable;
        private String notes;
    }

    /**
     * DTO pour le résumé de facturation
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BillingSummaryDTO {
        private Long invoiceId;
        private String invoiceNumber;
        private LocalDateTime invoiceDate;

        // Totaux par catégorie
        private BigDecimal consultationAmount;
        private BigDecimal labAmount;
        private BigDecimal pharmacyAmount;
        private BigDecimal otherAmount;
        
        // Frais de fiche (nouveau patient)
        private BigDecimal fraisFiche;
        private Boolean fraisFichePaid;
        private Boolean isNewPatient;
        
        // Statut de paiement par catégorie
        private Boolean consultationPaid;
        private Boolean labPaid;
        private Boolean pharmacyPaid;

        // Totaux généraux
        private BigDecimal totalAmount;
        private BigDecimal totalPaid;
        private BigDecimal balanceDue;

        // Statut de paiement
        private String paymentStatus; // SOLDE, PARTIEL, NON_PAYE, EN_ATTENTE
        private String paymentMethod;

        // Détail des paiements
        private List<PaymentDetailDTO> payments;
    }

    /**
     * DTO pour un détail de paiement
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentDetailDTO {
        private LocalDateTime paymentDate;
        private BigDecimal amount;
        private String method;
        private String reference;
        private String receivedBy;
    }
}
