package com.hospital.backend.service.impl;

import com.hospital.backend.dto.AdmissionDTO;
import com.hospital.backend.entity.Admission;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.User;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.AdmissionRepository;
import com.hospital.backend.repository.PatientRepository;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.service.AdmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdmissionServiceImpl implements AdmissionService {

    private final AdmissionRepository admissionRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public AdmissionDTO getById(Long id) {
        Admission admission = admissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admission introuvable avec l'ID: " + id));
        return mapToDTO(admission);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdmissionDTO> getAll() {
        return admissionRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdmissionDTO> getByPatientId(Long patientId) {
        return admissionRepository.findByPatientId(patientId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public AdmissionDTO create(AdmissionDTO dto) {
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient introuvable avec l'ID: " + dto.getPatientId()));
        
        User doctor = userRepository.findById(dto.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Docteur introuvable avec l'ID: " + dto.getDoctorId()));

        Admission admission = Admission.builder()
                .patient(patient)
                .doctor(doctor)
                .admissionDate(dto.getAdmissionDate() != null ? dto.getAdmissionDate() : LocalDateTime.now())
                .poids(dto.getPoids())
                .temperature(dto.getTemperature())
                .taille(dto.getTaille())
                .tensionArterielle(dto.getTensionArterielle())
                .reasonForVisit(dto.getReasonForVisit())
                .symptoms(dto.getSymptoms())
                .notes(dto.getNotes())
                .status(dto.getStatus() != null ? dto.getStatus() : Admission.AdmissionStatus.EN_ATTENTE)
                .build();

        Admission saved = admissionRepository.save(admission);
        log.info("Admission créée avec succès ID: {}", saved.getId());
        
        return mapToDTO(saved);
    }

    @Override
    public AdmissionDTO update(Long id, AdmissionDTO dto) {
        Admission admission = admissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admission introuvable avec l'ID: " + id));

        // Mise à jour des champs
        if (dto.getPoids() != null) admission.setPoids(dto.getPoids());
        if (dto.getTemperature() != null) admission.setTemperature(dto.getTemperature());
        if (dto.getTaille() != null) admission.setTaille(dto.getTaille());
        if (dto.getTensionArterielle() != null) admission.setTensionArterielle(dto.getTensionArterielle());
        if (dto.getReasonForVisit() != null) admission.setReasonForVisit(dto.getReasonForVisit());
        if (dto.getSymptoms() != null) admission.setSymptoms(dto.getSymptoms());
        if (dto.getNotes() != null) admission.setNotes(dto.getNotes());
        if (dto.getStatus() != null) admission.setStatus(dto.getStatus());

        Admission updated = admissionRepository.save(admission);
        log.info("Admission mise à jour avec succès ID: {}", updated.getId());
        
        return mapToDTO(updated);
    }

    @Override
    public void delete(Long id) {
        Admission admission = admissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admission introuvable avec l'ID: " + id));
        
        admissionRepository.delete(admission);
        log.info("Admission supprimée avec succès ID: {}", id);
    }

    private AdmissionDTO mapToDTO(Admission admission) {
        return AdmissionDTO.builder()
                .id(admission.getId())
                .patientId(admission.getPatient() != null ? admission.getPatient().getId() : null)
                .patientName(admission.getPatient() != null ? 
                        admission.getPatient().getFirstName() + " " + admission.getPatient().getLastName() : null)
                .doctorId(admission.getDoctor() != null ? admission.getDoctor().getId() : null)
                .doctorName(admission.getDoctor() != null ? 
                        admission.getDoctor().getFirstName() + " " + admission.getDoctor().getLastName() : null)
                .admissionDate(admission.getAdmissionDate())
                .poids(admission.getPoids())
                .temperature(admission.getTemperature())
                .taille(admission.getTaille())
                .tensionArterielle(admission.getTensionArterielle())
                .reasonForVisit(admission.getReasonForVisit())
                .symptoms(admission.getSymptoms())
                .notes(admission.getNotes())
                .status(admission.getStatus())
                .createdAt(admission.getCreatedAt())
                .updatedAt(admission.getUpdatedAt())
                .build();
    }
}
