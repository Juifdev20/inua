package com.hospital.backend.dto;

import lombok.Data;

@Data // Cette annotation génère automatiquement les méthodes getType() et getDescription()
public class SignalementRequest {
    private String type;        // Exemple: "Avis", "Plainte", "Technique"
    private String description; // Le texte écrit par le patient
    private Long doctorId;      // Optionnel : l'ID du docteur concerné
}