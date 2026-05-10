package com.hospital.backend.dto;

import lombok.Data;
import java.util.List;

/**
 * DTO pour la soumission groupée d'une boîte de résultats labo
 */
@Data
public class BoxSubmissionDTO {
    private Long consultationId;
    private List<ExamResultDTO> results;
    private String globalComment;
    private String submittedBy;
    private Long doctorId; // ← Ajout pour transmission au médecin
}
