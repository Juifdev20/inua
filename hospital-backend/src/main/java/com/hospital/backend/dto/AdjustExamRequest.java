package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO pour les ajustements de la caisse sur les examens prescrits
 * Permet de modifier quantités, désactiver des examens, ajouter des notes
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdjustExamRequest {

    /**
     * Liste des ajustements à appliquer sur les examens
     */
    private List<ExamAdjustmentDTO> exams;

    /**
     * DTO interne représentant un ajustement sur un examen spécifique
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExamAdjustmentDTO {

        /**
         * ID de l'examen prescrit (PrescribedExam.id)
         */
        private Long examId;

        /**
         * Nouvelle quantité (si modifiée par la caisse)
         * null = garder la quantité actuelle
         */
        private Integer quantity;

        /**
         * false = désactiver l'examen (ne sera pas facturé ni envoyé au labo)
         * true ou null = garder actif
         */
        private Boolean active;

        /**
         * Note du caissier sur cet examen (visible au labo)
         */
        private String cashierNote;
    }
}