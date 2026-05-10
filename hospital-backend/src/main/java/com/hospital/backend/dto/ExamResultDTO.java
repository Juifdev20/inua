package com.hospital.backend.dto;

import lombok.Data;

/**
 * DTO pour un résultat d'examen individuel dans une soumission groupée
 */
@Data
public class ExamResultDTO {
    private Long examId;
    private String resultValue;
    private String unit;
    private String labComment;
    private Boolean isCritical;
    private String analysisMethod;
}
