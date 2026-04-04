package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO pour la file d'attente du laboratoire (La "Boîte")
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabQueueItemDTO {
    private Long consultationId;
    private Long patientId;
    private String patientName;
    private String patientCode;
    private String doctorName;
    private String consultationStatus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    private List<ExamItemDTO> exams;
    
    // Statistiques
    private Integer totalExams;
    private Long pendingExams;
    private Long criticalExams;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExamItemDTO {
        private Long id;
        private String serviceName;
        private BigDecimal unitPrice;
        private Integer quantity;
        private BigDecimal totalPrice;
        private String doctorNote;
        private Boolean active;
        private String status;
        
        // Champs résultats
        private String resultValue;
        private String unit;
        private String referenceRangeText;
        private Boolean isCritical;
        private String labComment;
        private LocalDateTime resultEnteredAt;
    }
}
