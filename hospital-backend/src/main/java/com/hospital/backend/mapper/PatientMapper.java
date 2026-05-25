package com.hospital.backend.mapper;

import com.hospital.backend.dto.PatientSimpleDTO;
import com.hospital.backend.entity.Patient;
import org.springframework.stereotype.Component;

@Component
public class PatientMapper {

    public PatientSimpleDTO toSimpleDTO(Patient patient) {
        if (patient == null) return null;
        return PatientSimpleDTO.builder()
                .id(patient.getId())
                .firstName(patient.getFirstName())
                .lastName(patient.getLastName())
                .fullName(patient.getFirstName() + " " + patient.getLastName())
                .patientCode(patient.getPatientCode())
                .build();
    }
}