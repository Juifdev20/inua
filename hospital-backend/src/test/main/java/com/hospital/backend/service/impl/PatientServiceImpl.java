package com.hospital.backend.service.impl;

import com.hospital.backend.dto.PatientDTO;
import com.hospital.backend.dto.ConsultationDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.dto.ChangePasswordRequest;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.User;
import com.hospital.backend.entity.Consultation;
import com.hospital.backend.exception.BadRequestException;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.PatientRepository;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.repository.ConsultationRepository;
import com.hospital.backend.repository.InvoiceRepository;
import com.hospital.backend.service.PatientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PatientServiceImpl implements PatientService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final ConsultationRepository consultationRepository;
    private final InvoiceRepository invoiceRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public PatientDTO create(PatientDTO dto) {
        log.info("Création d'un nouveau patient: {} {}", dto.getFirstName(), dto.getLastName());

        if (dto.getEmail() != null && patientRepository.existsByEmail(dto.getEmail())) {
            throw new BadRequestException("Un patient avec cet email existe déjà");
        }

        Patient patient = mapToEntity(dto);
        patient = patientRepository.save(patient);
        syncUserWithPatient(patient);

        log.info("Patient créé avec le code: {}", patient.getPatientCode());
        return mapToDTO(patient);
    }

    @Override
    @Transactional
    public PatientDTO update(Long id, PatientDTO dto) {
        log.info("Mise à jour du patient ID: {}", id);
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient non trouvé avec l'ID: " + id));

        updateEntity(patient, dto);
        patient = patientRepository.save(patient);
        syncUserWithPatient(patient);

        return mapToDTO(patient);
    }

    @Override
    @Transactional
    public PatientDTO updateByEmail(String identifier, PatientDTO dto) {
        log.info("🛠️ Mise à jour du dossier via identifiant: {}", identifier);
        Patient patient = findPatientByIdentifier(identifier);
        updateEntity(patient, dto);
        Patient updated = patientRepository.save(patient);
        syncUserWithPatient(updated);
        return mapToDTO(updated);
    }

    /**
     * ✅ CORRIGÉ : Recherche par Email OU Username pour éviter l'erreur "Utilisateur non trouvé"
     */
    @Override
    @Transactional
    public void updatePassword(String identifier, ChangePasswordRequest request) {
        log.info("🔐 Tentative de changement de mot de passe pour l'identifiant: {}", identifier);

        // On cherche par email, et si non trouvé, on cherche par username (ex: kakule)
        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByUsername(identifier))
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'identifiant: " + identifier));

        // 1. Vérifier l'ancien mot de passe
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Le mot de passe actuel est incorrect");
        }

        // 2. Vérifier la correspondance des nouveaux mots de passe
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("La confirmation ne correspond pas au nouveau mot de passe");
        }

        // 3. Encoder et sauvegarder
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("✅ Mot de passe mis à jour avec succès pour l'utilisateur: {}", user.getUsername());
    }

    private void syncUserWithPatient(Patient patient) {
        userRepository.findByEmail(patient.getEmail()).ifPresent(user -> {
            user.setFirstName(patient.getFirstName());
            user.setLastName(patient.getLastName());
            user.setPhoneNumber(patient.getPhoneNumber());
            user.setAddress(patient.getAddress());
            user.setBloodType(patient.getBloodType());
            user.setPhotoUrl(patient.getPhotoUrl());
            if (patient.getDateOfBirth() != null) {
                user.setDateOfBirth(patient.getDateOfBirth().toString());
            }
            userRepository.save(user);
        });
    }

    private Patient findPatientByIdentifier(String identifier) {
        return patientRepository.findByEmail(identifier)
                .orElseGet(() -> {
                    User user = userRepository.findByUsername(identifier)
                            .orElseThrow(() -> new ResourceNotFoundException("Compte '" + identifier + "' introuvable."));
                    return patientRepository.findByEmail(user.getEmail())
                            .orElseThrow(() -> new ResourceNotFoundException("Dossier patient non trouvé."));
                });
    }

    @Override @Transactional(readOnly = true)
    public PatientDTO getById(Long id) {
        return mapToDTO(patientRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Patient non trouvé")));
    }

    @Override @Transactional(readOnly = true)
    public PatientDTO getByCode(String code) {
        return mapToDTO(patientRepository.findByPatientCode(code).orElseThrow(() -> new ResourceNotFoundException("Patient non trouvé")));
    }

    @Override @Transactional(readOnly = true)
    public PatientDTO getByEmail(String identifier) {
        return mapToDTO(findPatientByIdentifier(identifier));
    }

    @Override public PageResponse<PatientDTO> getAll(Pageable pageable) {
        return toPageResponse(patientRepository.findByIsActiveTrue(pageable));
    }

    @Override public PageResponse<PatientDTO> search(String query, Pageable pageable) {
        return toPageResponse(patientRepository.searchPatients(query, pageable));
    }

    @Override @Transactional public void delete(Long id) {
        patientRepository.deleteById(id);
    }

    @Override @Transactional public void deactivate(Long id) {
        patientRepository.findById(id).ifPresent(p -> { p.setIsActive(false); patientRepository.save(p); });
    }

    @Override public Long countActive() { return patientRepository.countActivePatients(); }

    // --- MAPPING LOGIC ---

    private PatientDTO mapToDTO(Patient patient) {
        if (patient == null) return null;

        List<ConsultationDTO> consultationDtos = consultationRepository
                .findByPatientIdOrderByConsultationDateDesc(patient.getId())
                .stream()
                .map(this::mapToConsultationDTO)
                .collect(Collectors.toList());

        long invoiceCount = invoiceRepository.countByPatientEmail(patient.getEmail());
        long medicalRecordsCount = (patient.getMedicalRecords() != null) ? patient.getMedicalRecords().size() : 0;

        return PatientDTO.builder()
                .id(patient.getId())
                .patientCode(patient.getPatientCode())
                .firstName(patient.getFirstName())
                .lastName(patient.getLastName())
                .dateOfBirth(patient.getDateOfBirth())
                .gender(patient.getGender())
                .phoneNumber(patient.getPhoneNumber())
                .email(patient.getEmail())
                .address(patient.getAddress())
                .city(patient.getCity())
                .bloodType(patient.getBloodType())
                .emergencyContact(patient.getEmergencyContact())
                .emergencyPhone(patient.getEmergencyPhone())
                .photoUrl(patient.getPhotoUrl())
                .allergies(patient.getAllergies())
                .chronicDiseases(patient.getChronicDiseases())
                .insuranceNumber(patient.getInsuranceNumber())
                .insuranceProvider(patient.getInsuranceProvider())
                .isActive(patient.getIsActive())
                .createdAt(patient.getCreatedAt())
                .updatedAt(patient.getUpdatedAt())
                .consultations(consultationDtos)
                .consultationCount((long) consultationDtos.size())
                .documentCount(invoiceCount + medicalRecordsCount)
                .build();
    }

    private Patient mapToEntity(PatientDTO dto) {
        return Patient.builder()
                .firstName(dto.getFirstName()).lastName(dto.getLastName())
                .dateOfBirth(dto.getDateOfBirth()).gender(dto.getGender())
                .phoneNumber(dto.getPhoneNumber()).email(dto.getEmail())
                .address(dto.getAddress()).city(dto.getCity())
                .bloodType(dto.getBloodType()).emergencyContact(dto.getEmergencyContact())
                .emergencyPhone(dto.getEmergencyPhone()).photoUrl(dto.getPhotoUrl())
                .allergies(dto.getAllergies()).chronicDiseases(dto.getChronicDiseases())
                .insuranceNumber(dto.getInsuranceNumber()).insuranceProvider(dto.getInsuranceProvider())
                .isActive(true).build();
    }

    private void updateEntity(Patient patient, PatientDTO dto) {
        if (hasText(dto.getFirstName())) patient.setFirstName(dto.getFirstName());
        if (hasText(dto.getLastName())) patient.setLastName(dto.getLastName());
        if (dto.getDateOfBirth() != null) patient.setDateOfBirth(dto.getDateOfBirth());
        if (dto.getGender() != null) patient.setGender(dto.getGender());
        if (hasText(dto.getPhoneNumber())) patient.setPhoneNumber(dto.getPhoneNumber());
        if (hasText(dto.getAddress())) patient.setAddress(dto.getAddress());
        if (hasText(dto.getBloodType())) patient.setBloodType(dto.getBloodType());
        if (hasText(dto.getCity())) patient.setCity(dto.getCity());
        if (hasText(dto.getPhotoUrl())) patient.setPhotoUrl(dto.getPhotoUrl());
        if (hasText(dto.getEmergencyContact())) patient.setEmergencyContact(dto.getEmergencyContact());
        if (hasText(dto.getEmergencyPhone())) patient.setEmergencyPhone(dto.getEmergencyPhone());
        if (hasText(dto.getAllergies())) patient.setAllergies(dto.getAllergies());
        if (hasText(dto.getChronicDiseases())) patient.setChronicDiseases(dto.getChronicDiseases());
        if (hasText(dto.getInsuranceNumber())) patient.setInsuranceNumber(dto.getInsuranceNumber());
        if (hasText(dto.getInsuranceProvider())) patient.setInsuranceProvider(dto.getInsuranceProvider());
    }

    private ConsultationDTO mapToConsultationDTO(Consultation consultation) {
        String doctorName = "Non assigné";
        Long doctorId = null;
        if (consultation.getDoctor() != null) {
            doctorId = consultation.getDoctor().getId();
            doctorName = "Dr. " + consultation.getDoctor().getFirstName() + " " + consultation.getDoctor().getLastName();
        }
        return ConsultationDTO.builder()
                .id(consultation.getId()).consultationCode(consultation.getConsultationCode())
                .patientId(consultation.getPatient().getId()).doctorId(doctorId).doctorName(doctorName)
                .consultationDate(consultation.getConsultationDate()).reasonForVisit(consultation.getReasonForVisit())
                .status(consultation.getStatus()).diagnosis(consultation.getDiagnosis()).build();
    }

    private boolean hasText(String s) { return s != null && !s.trim().isEmpty(); }

    private PageResponse<PatientDTO> toPageResponse(Page<Patient> page) {
        return PageResponse.<PatientDTO>builder()
                .content(page.getContent().stream().map(this::mapToDTO).collect(Collectors.toList()))
                .page(page.getNumber()).size(page.getSize()).totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages()).first(page.isFirst()).last(page.isLast()).build();
    }
}