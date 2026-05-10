package com.hospital.backend.dto;

import lombok.Data;
import lombok.AllArgsConstructor;

@Data
@AllArgsConstructor
public class DashboardStats {
    private long totalUtilisateurs;
    private long nouveauxUtilisateursMois; // Le "+12"
    private long totalDocteurs;
    private long nouveauxDocteursMois;    // Le "+2"
    private long totalPatients;
    private long nouveauxPatientsMois;
    private long totalDepartements;
}