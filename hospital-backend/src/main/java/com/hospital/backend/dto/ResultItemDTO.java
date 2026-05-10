package com.hospital.backend.dto;

import lombok.Data;

/**
 * DTO pour un résultat individuel de test
 */
@Data
public class ResultItemDTO {
    private Long testId;
    private String value;
    private String comment;
}
