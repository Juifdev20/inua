package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO pour la saisie des résultats de laboratoire
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabResultEntryDTO {
    private String resultValue;        // Valeur du résultat
    private String unit;               // Unité de mesure
    private String referenceMin;       // Valeur min de référence
    private String referenceMax;       // Valeur max de référence
    private String referenceRangeText; // Texte complet (ex: "0.8 - 1.2 g/L")
    private String labComment;         // Commentaire du laborantin
    private String technicianName;     // Nom du technicien
    private String analysisMethod;     // Méthode d'analyse
}
