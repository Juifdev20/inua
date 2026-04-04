package com.hospital.backend.dto;

import lombok.Data;
import java.util.List;

/**
 * DTO pour la soumission des résultats de laboratoire
 */
@Data
public class LabSubmissionDTO {
    private Long consultationId;
    private Long doctorId;
    private List<ResultItemDTO> results;
}
