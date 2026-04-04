package com.hospital.backend.dto;

import com.hospital.backend.entity.RecordStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalRecordDTO {

    private Long id;
    private String recordCode; // Ex: REC-1736600000

    // --- Informations Cliniques ---
    private String symptoms;    // Symptômes décrits par le patient
    private String diagnosis;   // Diagnostic posé par le médecin
    private String treatment;   // Traitement ou médicaments prescrits
    private String notes;       // Remarques additionnelles

    // --- Signes Vitaux (Constantes) ---
    private String vitalSigns;  // Observations générales
    private String bloodPressure; // Tension artérielle (ex: 12/8)
    private Double temperature;   // Température (ex: 37.5)
    private Double weight;        // Poids en kg
    private Double height;        // Taille en cm

    // --- État et Traçabilité ---
    private RecordStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // --- Informations du Docteur (pour l'affichage Admin) ---
    private Long doctorId;
    private String doctorFullName; // Concaténation de firstName et lastName du docteur
    private String doctorSpeciality; // Optionnel : pour savoir quel spécialiste a traité le patient

    // --- Lien Patient ---
    private Long patientId;
}