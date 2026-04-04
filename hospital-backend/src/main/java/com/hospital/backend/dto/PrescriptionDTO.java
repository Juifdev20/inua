package com.hospital.backend.dto;

import com.hospital.backend.entity.PrescriptionStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionDTO {
    private Long id;
    private String prescriptionCode;

    @NotNull(message = "La consultation est obligatoire")
    private Long consultationId;

    @NotNull(message = "Le patient est obligatoire")
    private Long patientId;
    private String patientName;
    private String patientCode;        // ✅ AJOUT: Code patient pour affichage caisse

    private Long doctorId;  // Plus @NotNull - sera auto-rempli par le backend
    private String doctorName;

    // ✅ AJOUT: Informations financières (pour la caisse pharmacie)
    private BigDecimal totalAmount;     // Total des médicaments
    private BigDecimal amountPaid;      // Montant payé
    private BigDecimal remainingAmount; // Reste à payer

    private List<PrescriptionItemDTO> items;
    private String notes;
    private PrescriptionStatus status;  // PRESCRITE, EN_ATTENTE_PAIEMENT, PAYEE, DISPENSEE

    // Pharmacien qui délivre
    private Long dispensedById;
    private String dispensedByName;
    private LocalDateTime dispensedAt;

    // ✅ AJOUT: Caisse qui a encaissé
    private Long paidById;
    private String paidByName;
    private LocalDateTime paidAt;

    // Dates
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ============================================================
    // CLASSE INTERNE: Item d'ordonnance (médicament)
    // ============================================================
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrescriptionItemDTO {
        private Long id;
        private Long medicationId;          // ID du médicament dans le catalogue
        private String medicationName;      // Nom du médicament
        private String medicationCode;      // Code du médicament (pour recherche fallback)
        private String dosage;              // Posologie (ex: "3x par jour")
        private String frequency;           // Fréquence (ex: "matin, soir")
        private String duration;            // Durée (ex: "7 jours")
        private Integer quantity;           // Quantité prescrite
        private Integer quantityPerDose;    // Quantité par prise
        private String instructions;        // Instructions spéciales

        // ✅ AJOUT: Informations commerciales pour la caisse
        private BigDecimal unitPrice;       // Prix unitaire
        private BigDecimal totalPrice;      // Prix total (quantité × prix unitaire)

        // ✅ AJOUT: Gestion stock et dispensation
        private Integer quantityDispensed;  // Quantité réellement délivrée
        private Integer stockQuantity;      // Quantité disponible en stock
        private Boolean available;          // Disponible en stock ?
        private String substitute;          // Médicament de substitution si indisponible

        // ✅ AJOUT: Ajustement caisse (comme pour les examens)
        private Boolean active;             // Actif ou retiré de l'ordonnance
        private String cashierNote;         // Note du caissier
    }
}