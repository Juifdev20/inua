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
                .fullName(patient.getFirstName() + " " + patient.getLastName())
                .build();
    }
}