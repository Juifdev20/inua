package com.hospital.backend.dto;

import lombok.Builder;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AllLabPaymentDTO {
    private Long id;
    private Long consultationId;
    private Long patientId;
    private String patientName;
    private String patientCode;
    private String consultationCode;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime consultationDate;

    // PRINCIPAUX CHAMPS POUR LES STATS
    private BigDecimal examTotalAmount;     // Montant total des examens
    private BigDecimal examAmountPaid;      // Montant deja paye
    private BigDecimal remainingAmount;     // Reste a payer

    // Examen
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PrescribedExamDTO {
        private Long id;
        private Long serviceId;
        private String serviceName;
        private BigDecimal unitPrice;
        private Integer quantity;
        private BigDecimal totalPrice;
        private String doctorNote;
        private String cashierNote;
        private Boolean active;
        private String status;

        // NOUVEAU: Champs resultats laboratoire
        private String resultValue;
        private String unit;
        private String referenceRangeText;
        private Boolean isCritical;
        private String labComment;
    }

    private List<PrescribedExamDTO> prescribedExams;

    // Si besoin d'un nom de medecin
    private String doctorName;
}
