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
public class ReceptionPaymentDTO {
    
    private Long id;
    private Long patientId;
    private String patientName;
    private String patientPhoto;
    private Long doctorId;
    private String doctorName;
    private String motif;
    private String status;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    
    // ✅ NOUVEAU: Champ pour identifier si la consultation est d'aujourd'hui
    private Boolean isToday;
    
    private List<ExamItemDTO> exams;
    
    // ✅ NOUVEAU: Champs pour le montant
    private BigDecimal totalAmount;      // Montant total à payer
    private BigDecimal examAmountPaid;    // Montant déjà payé
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExamItemDTO {
        private Long serviceId;
        private String note;
    }
}
