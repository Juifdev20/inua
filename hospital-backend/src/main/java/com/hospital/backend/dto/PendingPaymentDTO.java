package com.hospital.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingPaymentDTO {

    // ✅ AJOUT: ID principal manquant
    private Long id;

    private Long consultationId;
    private String consultationCode;

    // Patient info
    private Long patientId;
    private String patientName;
    private String patientCode;
    private String patientPhone;
    private String patientPhoto;

    // Doctor info
    private Long doctorId;
    private String doctorName;

    // Payment info - Spécifique examens laboratoire
    private BigDecimal examTotalAmount;      // Total des examens prescrits
    private BigDecimal examAmountPaid;       // Montant déjà payé
    private BigDecimal remainingAmount;      // Reste à payer (calculé)

    // ✅ AJOUT: Date de consultation pour affichage
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime consultationDate;

    // Exam details
    private List<PrescribedExamDTO> prescribedExams;

    // Status and dates
    private String status; // EXAMENS_PRESCRITS, EXAMENS_PAYES, etc.

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    // ============================================================
    // CLASSE INTERNE: Détails d'un examen prescrit
    // ============================================================
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PrescribedExamDTO {
        private Long id;
        private Long serviceId;
        private String serviceName;
        private BigDecimal unitPrice;

        // ✅ AJOUT: Quantité (important pour la caisse)
        private Integer quantity;

        // ✅ AJOUT: Prix total calculé (unitPrice × quantity)
        private BigDecimal totalPrice;

        private String doctorNote;

        // ✅ AJOUT: Note du caissier (visible/modifiable par la caisse)
        private String cashierNote;

        // ✅ AJOUT: Actif ou désactivé (pour les ajustements caisse)
        private Boolean active;

        // ✅ AJOUT: Statut de l'examen (PRESCRIBED, CANCELLED, etc.)
        private String status;

        // ★ AJOUT: Champs résultats laboratoire
        private String resultValue;
        private String unit;
        private String referenceRangeText;
        private Boolean isCritical;
        private String labComment;
    }
}