package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalServiceDTO {
    private Long id;
    private String nom;
    private String description;
    private Double prix;
    private String departement;  // ✅ CORRECTION: departement au lieu de categorie
    private Integer duree;        // ✅ AJOUT: duree en minutes
    private Boolean isActive;    // ✅ CORRECTION: isActive au lieu de actif
}
