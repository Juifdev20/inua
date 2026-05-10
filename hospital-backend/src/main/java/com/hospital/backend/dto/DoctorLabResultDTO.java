package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO pour un résultat d'examen individuel dans une consultation
 * Affiché dans le tableau des résultats côté docteur
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorLabResultDTO {
    private Long id;
    private String examName;           // Nom de l'examen (ex: Glycémie, VIH)
    private String resultValue;        // Résultat obtenu
    private String unit;               // Unité de mesure
    private String referenceRange;     // Norme/Référence
    private String comment;            // Commentaire du biologiste
    private Boolean isCritical;        // Valeur critique ?
    private LocalDateTime resultDate;  // Date du résultat
}
