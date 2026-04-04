package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO pour le regroupement des résultats de laboratoire par consultation ("Boîte")
 * Utilisé par le docteur pour voir tous les examens d'une consultation groupés
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultationLabResultsDTO {
    
    // --- INFOS CONSULTATION ---
    private Long consultationId;
    private String consultationCode;
    private String consultationTitle;     // Titre affiché (ex: "Bilan complet")
    private LocalDateTime consultationDate;
    private String status;              // Statut de la consultation
    
    // --- INFOS PATIENT ---
    private Long patientId;
    private String patientName;
    private String patientCode;
    private String patientPhoto;
    
    // --- INFOS MÉDECIN ---
    private Long doctorId;
    private String doctorName;
    private String doctorPhoto;
    
    // --- LISTE DES EXAMENS ---
    private List<DoctorLabResultDTO> examResults;
    
    // --- STATISTIQUES ---
    private Integer totalExams;         // Nombre total d'examens
    private Long criticalExams;         // Nombre d'examens critiques
    private Boolean hasResults;         // Au moins un résultat disponible ?
    private LocalDateTime resultsDate;  // Date de disponibilité des résultats
    
    // --- INTERPRÉTATION GLOBALE ---
    private String globalInterpretation; // Interprétation générale du biologiste
    
    /**
     * Retourne un libellé formaté pour l'affichage dans la liste
     * Ex: "Bilan complet - 5 tests" ou "Examens laboratoire - 3 tests"
     */
    public String getDisplayTitle() {
        if (consultationTitle != null && !consultationTitle.isEmpty()) {
            return consultationTitle + " - " + totalExams + " test" + (totalExams > 1 ? "s" : "");
        }
        return "Examens laboratoire - " + totalExams + " test" + (totalExams > 1 ? "s" : "");
    }
}
