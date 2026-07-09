package com.hospital.backend.service.impl;

import com.hospital.backend.dto.HospitalDTO;
import com.hospital.backend.entity.Hospital;
import com.hospital.backend.exception.BadRequestException;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.entity.NotificationType;
import com.hospital.backend.entity.Role;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.HospitalRepository;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.service.HospitalService;
import com.hospital.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HospitalServiceImpl implements HospitalService {

    private final HospitalRepository hospitalRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Override
    public List<HospitalDTO> getAllHospitals() {
        return hospitalRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public HospitalDTO getHospitalById(Long id) {
        Hospital h = getEntityById(id);
        return toDTO(h);
    }

    @Override
    @Transactional
    public HospitalDTO createHospital(HospitalDTO dto) {
        if (hospitalRepository.existsByCode(dto.getCode())) {
            throw new BadRequestException("Un hopital avec le code '" + dto.getCode() + "' existe deja");
        }
        // Ignorer l'ID du DTO pour permettre la génération automatique par la base de données
        Hospital h = Hospital.builder()
                .id(null) // Force null pour éviter les conflits d'ID
                .nom(dto.getNom())
                .code(dto.getCode().toUpperCase())
                .address(dto.getAddress())
                .city(dto.getCity())
                .country(dto.getCountry())
                .phone(dto.getPhone())
                .email(dto.getEmail())
                .logoUrl(dto.getLogoUrl())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .subscriptionPlan(dto.getSubscriptionPlan() != null ? dto.getSubscriptionPlan() : "STANDARD")
                .maxUsers(dto.getMaxUsers() != null ? dto.getMaxUsers() : 100)
                .adminEmail(dto.getAdminEmail())
                .notes(dto.getNotes())
                .build();
        Hospital saved = hospitalRepository.save(h);
        log.info("[Hospital] Nouvel hopital cree: {} ({})", saved.getNom(), saved.getCode());
        return toDTO(saved);
    }

    @Override
    @Transactional
    public HospitalDTO updateHospital(Long id, HospitalDTO dto) {
        Hospital h = getEntityById(id);
        if (dto.getNom() != null) h.setNom(dto.getNom());
        if (dto.getAddress() != null) h.setAddress(dto.getAddress());
        if (dto.getCity() != null) h.setCity(dto.getCity());
        if (dto.getCountry() != null) h.setCountry(dto.getCountry());
        if (dto.getPhone() != null) h.setPhone(dto.getPhone());
        if (dto.getEmail() != null) h.setEmail(dto.getEmail());
        if (dto.getLogoUrl() != null) h.setLogoUrl(dto.getLogoUrl());
        if (dto.getSubscriptionPlan() != null) h.setSubscriptionPlan(dto.getSubscriptionPlan());
        if (dto.getMaxUsers() != null) h.setMaxUsers(dto.getMaxUsers());
        if (dto.getAdminEmail() != null) h.setAdminEmail(dto.getAdminEmail());
        if (dto.getNotes() != null) h.setNotes(dto.getNotes());
        return toDTO(hospitalRepository.save(h));
    }

    @Override
    @Transactional
    public void toggleHospitalStatus(Long id) {
        Hospital h = getEntityById(id);
        boolean newStatus = !Boolean.TRUE.equals(h.getIsActive());
        h.setIsActive(newStatus);
        hospitalRepository.save(h);
        log.info("[Hospital] Statut hopital {} -> {}", h.getNom(), h.getIsActive());

        // Si désactivation, envoyer alerte aux utilisateurs cliniques uniquement
        if (!newStatus) {
            List<Long> clinicalUserIds = hospitalRepository.findClinicalUserIdsByHospitalId(id);
            log.info("🏥 [SHUTDOWN] Désactivation hôpital {} - {} utilisateurs cliniques à notifier", h.getNom(), clinicalUserIds.size());
            if (!clinicalUserIds.isEmpty()) {
                notificationService.notifyHospitalShutdownWarning(id, h.getNom(), clinicalUserIds);
            }
        }

        // Envoyer notification de statut à tous les utilisateurs de l'hôpital
        List<Long> userIds = hospitalRepository.findUserIdsByHospitalId(id);
        if (!userIds.isEmpty()) {
            notificationService.notifyHospitalStatusChanged(id, h.getNom(), newStatus, userIds);
        }
    }

    @Override
    @Transactional
    public void deleteHospital(Long id) {
        if (id == 1L) throw new BadRequestException("L'hopital principal ne peut pas etre supprime");
        Hospital h = getEntityById(id);
        hospitalRepository.delete(h);
    }

    @Override
    public Hospital getEntityById(Long id) {
        return hospitalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hopital non trouve avec id: " + id));
    }

    // ═══════════════════════════════════════════════════
    // INSCRIPTION PUBLIQUE / WORKFLOW D'APPROBATION
    // ═══════════════════════════════════════════════════

    @Override
    @Transactional
    public HospitalDTO registerPublic(HospitalDTO dto) {
        if (dto.getNom() == null || dto.getNom().isBlank()) {
            throw new BadRequestException("Le nom de l'établissement est obligatoire");
        }
        if (dto.getAdminEmail() == null || dto.getAdminEmail().isBlank()) {
            throw new BadRequestException("L'email de l'administrateur est obligatoire");
        }
        // Un email d'admin ne peut pas déjà correspondre à un compte existant
        if (userRepository.existsByEmail(dto.getAdminEmail())) {
            throw new BadRequestException("Cet email administrateur est déjà utilisé par un compte existant");
        }

        // Code : fourni ou généré automatiquement, garanti unique
        String code = (dto.getCode() != null && !dto.getCode().isBlank())
                ? dto.getCode().toUpperCase().replaceAll("[^A-Z0-9]", "")
                : generateCodeFromName(dto.getNom());
        code = ensureUniqueCode(code);

        Hospital h = Hospital.builder()
                .id(null)
                .nom(dto.getNom())
                .code(code)
                .address(dto.getAddress())
                .city(dto.getCity())
                .country(dto.getCountry())
                .phone(dto.getPhone())
                .email(dto.getEmail())
                .adminEmail(dto.getAdminEmail())
                .requestedAdminFirstName(dto.getRequestedAdminFirstName())
                .requestedAdminLastName(dto.getRequestedAdminLastName())
                .requestedAdminPhone(dto.getRequestedAdminPhone())
                .notes(dto.getNotes())
                .subscriptionPlan(dto.getSubscriptionPlan() != null ? dto.getSubscriptionPlan() : "STANDARD")
                .maxUsers(dto.getMaxUsers() != null ? dto.getMaxUsers() : 100)
                .isActive(false)                 // reste inactif tant que non approuvé
                .registrationStatus("PENDING")
                .build();

        Hospital saved = hospitalRepository.save(h);
        log.info("[Hospital] 📩 Nouvelle demande d'inscription: {} ({}) - admin: {}",
                saved.getNom(), saved.getCode(), saved.getAdminEmail());

        notifySuperAdmins(saved);
        return toDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HospitalDTO> getPendingRegistrations() {
        return hospitalRepository.findByRegistrationStatus("PENDING").stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public HospitalDTO setRegistrationStatus(Long id, String status, String rejectionReason) {
        Hospital h = getEntityById(id);
        String normalized = status == null ? "" : status.trim().toUpperCase();

        switch (normalized) {
            case "APPROVED" -> {
                h.setRegistrationStatus("APPROVED");
                h.setIsActive(true);
                h.setRejectionReason(null);
            }
            case "REJECTED" -> {
                h.setRegistrationStatus("REJECTED");
                h.setIsActive(false);
                h.setRejectionReason(rejectionReason);
            }
            default -> throw new BadRequestException("Statut invalide: " + status + " (attendu APPROVED ou REJECTED)");
        }

        Hospital saved = hospitalRepository.save(h);
        log.info("[Hospital] Demande {} -> {}", saved.getNom(), saved.getRegistrationStatus());
        return toDTO(saved);
    }

    /** Notifie tous les superadmins qu'une nouvelle demande d'inscription est en attente. */
    private void notifySuperAdmins(Hospital hospital) {
        try {
            List<User> superAdmins = new ArrayList<>();
            for (String roleName : List.of("ROLE_SUPERADMIN", "SUPERADMIN")) {
                roleRepository.findByNom(roleName)
                        .ifPresent(role -> superAdmins.addAll(userRepository.findByRole(role)));
            }
            String title = "Nouvelle demande d'hôpital";
            String message = "L'établissement « " + hospital.getNom() + " » (" + hospital.getCode()
                    + ") demande son inscription. Admin: " + hospital.getAdminEmail();
            for (User sa : superAdmins) {
                notificationService.createAndSend(sa, title, message, NotificationType.SYSTEME, hospital.getId());
            }
            log.info("[Hospital] 🔔 {} superadmin(s) notifié(s) de la demande {}", superAdmins.size(), hospital.getCode());
        } catch (Exception e) {
            // La notification ne doit jamais bloquer l'inscription
            log.warn("[Hospital] Impossible de notifier les superadmins: {}", e.getMessage());
        }
    }

    private String generateCodeFromName(String nom) {
        String base = nom.toUpperCase().replaceAll("[^A-Z0-9]", "");
        if (base.length() > 8) base = base.substring(0, 8);
        if (base.isBlank()) base = "HOP";
        return base;
    }

    private String ensureUniqueCode(String code) {
        String candidate = code;
        int suffix = 1;
        while (hospitalRepository.existsByCode(candidate)) {
            candidate = code + suffix;
            suffix++;
        }
        return candidate;
    }

    private HospitalDTO toDTO(Hospital h) {
        long users = hospitalRepository.countUsersByHospitalId(h.getId());
        long patients = hospitalRepository.countPatientsByHospitalId(h.getId());
        return HospitalDTO.builder()
                .id(h.getId())
                .nom(h.getNom())
                .code(h.getCode())
                .address(h.getAddress())
                .city(h.getCity())
                .country(h.getCountry())
                .phone(h.getPhone())
                .email(h.getEmail())
                .logoUrl(h.getLogoUrl())
                .isActive(h.getIsActive())
                .subscriptionPlan(h.getSubscriptionPlan())
                .maxUsers(h.getMaxUsers())
                .adminEmail(h.getAdminEmail())
                .notes(h.getNotes())
                .registrationStatus(h.getRegistrationStatus() != null ? h.getRegistrationStatus() : "APPROVED")
                .requestedAdminFirstName(h.getRequestedAdminFirstName())
                .requestedAdminLastName(h.getRequestedAdminLastName())
                .requestedAdminPhone(h.getRequestedAdminPhone())
                .rejectionReason(h.getRejectionReason())
                .createdAt(h.getCreatedAt())
                .updatedAt(h.getUpdatedAt())
                .totalUsers(users)
                .totalPatients(patients)
                .build();
    }
}
