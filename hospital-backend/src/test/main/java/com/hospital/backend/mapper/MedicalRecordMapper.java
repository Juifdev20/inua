package com.hospital.backend.mapper;

import com.hospital.backend.dto.MedicalRecordDTO;
import com.hospital.backend.entity.MedicalRecord;
import org.springframework.stereotype.Component;

@Component
public class MedicalRecordMapper {

    /**
     * Convertit l'Entité (Base de données) vers le DTO (Frontend)
     */
    public MedicalRecordDTO toDto(MedicalRecord entity) {
        if (entity == null) return null;

        return MedicalRecordDTO.builder()
                .id(entity.getId())
                .recordCode(entity.getRecordCode())
                .symptoms(entity.getSymptoms())
                .diagnosis(entity.getDiagnosis())
                .treatment(entity.getTreatment())
                .notes(entity.getNotes())
                .vitalSigns(entity.getVitalSigns())
                .bloodPressure(entity.getBloodPressure())
                .temperature(entity.getTemperature())
                .weight(entity.getWeight())
                .height(entity.getHeight())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                // Extraction sécurisée des infos du docteur
                .doctorId(entity.getDoctor() != null ? entity.getDoctor().getId() : null)
                .doctorFullName(entity.getDoctor() != null ?
                        entity.getDoctor().getFirstName() + " " + entity.getDoctor().getLastName() : "Non assigné")
                // ID du patient pour le lien
                .patientId(entity.getPatient() != null ? entity.getPatient().getId() : null)
                .build();
    }

    /**
     * Note: On peut aussi ajouter une méthode toEntity ici si tu as besoin
     * de transformer un DTO reçu du frontend en objet pour la base de données.
     */
}