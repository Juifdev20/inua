package com.hospital.backend.service.impl;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.BadRequestException;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.PatientService;
import com.hospital.backend.mapper.PatientMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PatientServiceImpl implements PatientService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ConsultationRepository consultationRepository;
    private final InvoiceRepository invoiceRepository;
    private final PasswordEncoder passwordEncoder;
    private final PatientMapper patientMapper;

    // ✅ Dossier 'patients' pour correspondre aux logs et SecurityConfig
    private final String UPLOAD_DIR = "uploads/patients";

    @Override
    @Transactional(readOnly = true)
    public List<PatientSimpleDTO> getAllSimpleList() {
        log.info("Récupération de la liste simplifiée des patients pour la réception");
        return patientRepository.findAllActivePatients().stream()
                .map(patientMapper::toSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PatientSimpleDTO> searchSimple(String query) {
        log.info("Recherche simplifiée pour le triage : {}", query);
        return patientRepository.searchActivePatientsList(query).stream()
                .map(patientMapper::toSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PatientDTO create(PatientDTO dto, MultipartFile photo) {
        if (photo != null && !photo.isEmpty()) {
            log.info("Traitement de la photo réelle pour le nouveau patient");
            String photoPath = saveImage(photo);
            dto.setPhotoUrl(photoPath);
        }
        return this.create(dto);
    }

    @Override
    @Transactional
    public PatientDTO create(PatientDTO dto) {
        log.info("Création d'un nouveau patient et de son compte : {} {}", dto.getFirstName(), dto.getLastName());

        String emailToUse = hasText(dto.getEmail()) ? dto.getEmail().trim() : null;

        Patient patient = mapToEntity(dto);
        patient.setEmail(emailToUse);
        patient = patientRepository.save(patient);

        String baseUsername = (dto.getFirstName() + "." + dto.getLastName()).toLowerCase().replaceAll("\\s+", "");
        String finalUsername = baseUsername + patient.getId();
        String defaultPassword = "Patient123";

        if (emailToUse == null) {
            emailToUse = finalUsername + "@hospital.com";
        }

        if (userRepository.existsByEmail(emailToUse)) {
            throw new BadRequestException("Un compte utilisateur avec cet email existe déjà : " + emailToUse);
        }

        Role patientRole = roleRepository.findByNom("ROLE_PATIENT")
                .orElseThrow(() -> new ResourceNotFoundException("Rôle ROLE_PATIENT non trouvé en base de données"));

        User newUser = User.builder()
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .username(finalUsername)
                .email(emailToUse)
                .password(passwordEncoder.encode(defaultPassword))
                .role(patientRole)
                .isActive(true)
                .phoneNumber(dto.getPhoneNumber())
                .address(dto.getAddress())
                .bloodType(dto.getBloodType())
                .photoUrl(dto.getPhotoUrl())
                .build();

        if (patient.getDateOfBirth() != null) {
            newUser.setDateOfBirth(patient.getDateOfBirth().toString());
        }

        User savedUser = userRepository.save(newUser);

        patient.setUser(savedUser);
        patient.setEmail(emailToUse);
        patient = patientRepository.save(patient);

        sendAccessNotifications(patient, finalUsername, defaultPassword);

        log.info("Patient créé avec succès. Code: {}, Username: {}", patient.getPatientCode(), finalUsername);
        return mapToDTO(patient);
    }

    @Override
    @Transactional
    public PatientDTO update(Long id, PatientDTO dto, MultipartFile photo) {
        if (photo != null && !photo.isEmpty()) {
            log.info("Mise à jour physique de la photo pour le patient ID: {}", id);
            String photoPath = saveImage(photo);
            dto.setPhotoUrl(photoPath);
        }
        return this.update(id, dto);
    }

    private String saveImage(MultipartFile file) {
        try {
            String rootDir = System.getProperty("user.dir");
            Path uploadPath = Paths.get(rootDir, "uploads", "patients");

            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String fileName = "patient_" + UUID.randomUUID().toString() + ".jpg";
            Path filePath = uploadPath.resolve(fileName);

            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            log.info("✅ Photo enregistrée physiquement : {}", filePath.toString());

            return "patients/" + fileName;
        } catch (IOException e) {
            log.error("❌ Erreur de stockage : {}", e.getMessage());
            throw new RuntimeException("Erreur lors de l'enregistrement du fichier photo.");
        }
    }

    @Override
    @Transactional
    public PatientDTO update(Long id, PatientDTO dto) {
        log.info("Mise à jour (Triage/Admission) du patient ID: {}", id);
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient non trouvé avec l'ID: " + id));

        updateEntity(patient, dto);

        if (dto.getIsActive() != null) {
            patient.setIsActive(dto.getIsActive());
            if (patient.getUser() != null) {
                patient.getUser().setIsActive(dto.getIsActive());
            }
        }

        patient = patientRepository.save(patient);
        syncUserWithPatient(patient);

        return mapToDTO(patient);
    }

    @Override
    @Transactional
    public PatientDTO updateByEmail(String identifier, PatientDTO dto) {
        Patient patient = findPatientByIdentifier(identifier);
        updateEntity(patient, dto);
        Patient updated = patientRepository.save(patient);
        syncUserWithPatient(updated);
        return mapToDTO(updated);
    }

    @Override
    @Transactional
    public void updatePassword(String identifier, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByUsername(identifier))
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Le mot de passe actuel est incorrect");
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("La confirmation ne correspond pas");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PatientDTO> getAllList() {
        return patientRepository.findAllActivePatients().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PatientDTO> getAll(Pageable pageable) {
        return toPageResponse(patientRepository.findByIsActiveTrue(pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PatientDTO> getAllArchived(Pageable pageable) {
        return toPageResponse(patientRepository.findByIsActiveFalse(pageable));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PatientDTO> search(String query, Pageable pageable) {
        return toPageResponse(patientRepository.searchActivePatients(query, pageable));
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        log.info("Archivage (Soft Delete) du patient ID: {}", id);
        patientRepository.findById(id).ifPresent(p -> {
            p.setIsActive(false);
            if (p.getUser() != null) {
                p.getUser().setIsActive(false);
                userRepository.save(p.getUser());
            }
            patientRepository.save(p);
        });
    }

    @Override
    @Transactional
    public void activate(Long id) {
        log.info("Restauration du patient ID: {}", id);
        patientRepository.findById(id).ifPresent(p -> {
            p.setIsActive(true);
            if (p.getUser() != null) {
                p.getUser().setIsActive(true);
                userRepository.save(p.getUser());
            }
            patientRepository.save(p);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public Long countActive() { return patientRepository.countActivePatients(); }

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

    @Override @Transactional
    public void delete(Long id) {
        patientRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void deleteAllWithoutPhotos() {
        log.warn("🚀 Démarrage du nettoyage des patients sans photos...");
        List<Patient> toDelete = patientRepository.findAll().stream()
                .filter(p -> p.getPhotoUrl() == null || p.getPhotoUrl().trim().isEmpty())
                .collect(Collectors.toList());

        for (Patient p : toDelete) {
            if (p.getUser() != null) {
                userRepository.delete(p.getUser());
            }
            patientRepository.delete(p);
        }
        log.warn("✅ Nettoyage terminé.");
    }

    private void syncUserWithPatient(Patient patient) {
        if (patient.getUser() != null) {
            User user = patient.getUser();
            user.setFirstName(patient.getFirstName());
            user.setLastName(patient.getLastName());
            user.setPhoneNumber(patient.getPhoneNumber());
            user.setAddress(patient.getAddress());
            user.setBloodType(patient.getBloodType());
            user.setPhotoUrl(patient.getPhotoUrl());
            if (patient.getDateOfBirth() != null) user.setDateOfBirth(patient.getDateOfBirth().toString());
            userRepository.save(user);
        }
    }

    private Patient findPatientByIdentifier(String identifier) {
        return patientRepository.findByEmailOrUsername(identifier)
                .orElseThrow(() -> new ResourceNotFoundException("Dossier patient introuvable pour : " + identifier));
    }

    private PatientDTO mapToDTO(Patient patient) {
        if (patient == null) return null;
        String finalPhoto = hasText(patient.getPhotoUrl()) ? patient.getPhotoUrl() :
                (patient.getUser() != null ? patient.getUser().getPhotoUrl() : null);

        List<ConsultationDTO> consultationDtos = consultationRepository
                .findByPatientIdOrderByConsultationDateDesc(patient.getId())
                .stream()
                .map(this::mapToConsultationDTO)
                .collect(Collectors.toList());

        long invoiceCount = hasText(patient.getEmail()) ? invoiceRepository.countByPatientEmail(patient.getEmail()) : 0;

        return PatientDTO.builder()
                .id(patient.getId()).patientCode(patient.getPatientCode())
                .firstName(patient.getFirstName()).lastName(patient.getLastName())
                .dateOfBirth(patient.getDateOfBirth()).gender(patient.getGender())
                .birthPlace(patient.getBirthPlace())
                .profession(patient.getProfession())
                .maritalStatus(patient.getMaritalStatus())
                .religion(patient.getReligion())
                .nationality(patient.getNationality())
                .phoneNumber(patient.getPhoneNumber()).email(patient.getEmail())
                .address(patient.getAddress()).city(patient.getCity())
                .bloodType(patient.getBloodType()).isActive(patient.getIsActive())
                .photoUrl(finalPhoto).createdAt(patient.getCreatedAt()).updatedAt(patient.getUpdatedAt())
                // ✅ NOUVEAU : Signes vitaux pour le Triage
                .weight(patient.getWeight())
                .height(patient.getHeight())
                .bloodPressure(patient.getBloodPressure())
                .temperature(patient.getTemperature())
                .heartRate(patient.getHeartRate())
                .symptoms(patient.getSymptoms())
                .consultations(consultationDtos).consultationCount((long) consultationDtos.size())
                .documentCount(invoiceCount + (patient.getMedicalRecords() != null ? patient.getMedicalRecords().size() : 0))
                .hasMedicalRecord(!consultationDtos.isEmpty())
                .build();
    }

    private Patient mapToEntity(PatientDTO dto) {
        return Patient.builder()
                .firstName(dto.getFirstName()).lastName(dto.getLastName()
                )
                .dateOfBirth(dto.getDateOfBirth()).gender(dto.getGender())
                .birthPlace(dto.getBirthPlace())
                .profession(dto.getProfession())
                .maritalStatus(dto.getMaritalStatus())
                .religion(dto.getReligion())
                .nationality(dto.getNationality())
                .phoneNumber(dto.getPhoneNumber()).email(dto.getEmail())
                .address(dto.getAddress()).city(dto.getCity())
                .bloodType(dto.getBloodType()).photoUrl(dto.getPhotoUrl())
                // ✅ NOUVEAU : Signes vitaux
                .weight(dto.getWeight())
                .height(dto.getHeight())
                .bloodPressure(dto.getBloodPressure())
                .temperature(dto.getTemperature())
                .heartRate(dto.getHeartRate())
                .symptoms(dto.getSymptoms())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true).build();
    }

    private void updateEntity(Patient patient, PatientDTO dto) {
        if (hasText(dto.getFirstName())) patient.setFirstName(dto.getFirstName());
        if (hasText(dto.getLastName())) patient.setLastName(dto.getLastName());
        if (dto.getDateOfBirth() != null) patient.setDateOfBirth(dto.getDateOfBirth());
        if (hasText(dto.getBirthPlace())) patient.setBirthPlace(dto.getBirthPlace());
        if (hasText(dto.getProfession())) patient.setProfession(dto.getProfession());
        if (hasText(dto.getMaritalStatus())) patient.setMaritalStatus(dto.getMaritalStatus());
        if (hasText(dto.getReligion())) patient.setReligion(dto.getReligion());
        if (hasText(dto.getNationality())) patient.setNationality(dto.getNationality());
        if (dto.getGender() != null) patient.setGender(dto.getGender());
        if (hasText(dto.getPhoneNumber())) patient.setPhoneNumber(dto.getPhoneNumber());
        if (hasText(dto.getAddress())) patient.setAddress(dto.getAddress());
        if (hasText(dto.getPhotoUrl())) patient.setPhotoUrl(dto.getPhotoUrl());
        if (dto.getEmail() != null) patient.setEmail(hasText(dto.getEmail()) ? dto.getEmail().trim() : null);

        // ✅ CRUCIAL : Signes Vitaux (Triage / Admission)
        if (dto.getWeight() != null) patient.setWeight(dto.getWeight());
        if (dto.getHeight() != null) patient.setHeight(dto.getHeight());
        if (hasText(dto.getBloodPressure())) patient.setBloodPressure(dto.getBloodPressure());
        if (dto.getTemperature() != null) patient.setTemperature(dto.getTemperature());
        if (dto.getHeartRate() != null) patient.setHeartRate(dto.getHeartRate());
        if (hasText(dto.getSymptoms())) patient.setSymptoms(dto.getSymptoms());
    }

    private ConsultationDTO mapToConsultationDTO(Consultation c) {
        return ConsultationDTO.builder()
                .id(c.getId()).consultationCode(c.getConsultationCode())
                .consultationDate(c.getConsultationDate()).status(c.getStatus()).build();
    }

    private void sendAccessNotifications(Patient patient, String username, String password) {
        String message = String.format(
                "Bienvenue chez INUA Hospital, %s %s. Votre compte est prêt. Identifiant : %s | Mot de passe : %s. ",
                patient.getFirstName(), patient.getLastName(), username, password
        );
        if (hasText(patient.getPhoneNumber())) log.info("📱 [SMS] To {}: {}", patient.getPhoneNumber(), message);
        if (hasText(patient.getEmail())) log.info("📧 [EMAIL] To {}: {}", patient.getEmail(), message);
    }

    private boolean hasText(String s) { return s != null && !s.trim().isEmpty(); }

    private PageResponse<PatientDTO> toPageResponse(Page<Patient> page) {
        return PageResponse.<PatientDTO>builder()
                .content(page.getContent().stream().map(this::mapToDTO).collect(Collectors.toList()))
                .page(page.getNumber()).size(page.getSize()).totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages()).first(page.isFirst()).last(page.isLast()).build();
    }
}

