package com.hospital.backend.service;

import com.hospital.backend.entity.Hospital;
import com.hospital.backend.entity.Role;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Service réutilisable de création du compte ADMIN d'un hôpital :
 * mot de passe temporaire + PDF d'identifiants + email.
 * Utilisé par le Super Admin (manuel) ET par l'activation automatique (paiement/essai).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminProvisioningService {

    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final AdminCredentialsPdfService adminCredentialsPdfService;
    private final EmailService emailService;
    private final AuditLogService auditLogService;

    /** Vrai si l'hôpital possède déjà au moins un compte ADMIN. */
    @Transactional(readOnly = true)
    public boolean hasAdmin(Long hospitalId) {
        return userRepository.findByHospitalId(hospitalId).stream()
                .anyMatch(u -> u.getRole() != null && u.getRole().getNom() != null
                        && u.getRole().getNom().toUpperCase().contains("ADMIN"));
    }

    /**
     * Crée le compte ADMIN de l'hôpital et envoie les identifiants par email.
     * @param actor auteur de l'action pour l'audit ("SUPERADMIN" ou "AUTO")
     * @return map { id, email, hospital, pdfBase64, filename }
     */
    @Transactional
    public Map<String, Object> provisionAdmin(Hospital hospital, String email,
                                              String firstName, String lastName, String actor) {
        String tempPassword = java.util.UUID.randomUUID().toString().substring(0, 10);

        Role adminRole = roleRepository.findByNom("ROLE_ADMIN")
                .orElseThrow(() -> new RuntimeException("Role ROLE_ADMIN non trouvé"));

        User admin = User.builder()
                .username(email)
                .email(email)
                .firstName(firstName != null ? firstName : "Admin")
                .lastName(lastName != null ? lastName : hospital.getNom())
                .password(passwordEncoder.encode(tempPassword))
                .role(adminRole)
                .hospital(hospital)
                .isActive(true)
                .mustChangePassword(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(admin);

        byte[] pdfBytes = adminCredentialsPdfService.generate(saved, tempPassword, hospital);
        String pdfBase64 = adminCredentialsPdfService.toBase64(pdfBytes);

        emailService.sendCredentialsEmail(email, admin.getFirstName(), admin.getLastName(), email, tempPassword, "ADMIN");

        auditLogService.logAction("ADMIN_PROVISIONED", actor != null ? actor : "AUTO",
                "HOSPITAL-" + hospital.getId(), "Admin " + email + " pour " + hospital.getNom(), "success", "127.0.0.1");

        log.info("👤 [PROVISION] Admin {} créé pour {} (par {})", email, hospital.getNom(), actor);
        return Map.of("id", saved.getId(), "email", email, "hospital", hospital.getNom(),
                "pdfBase64", pdfBase64, "filename", "credentials_" + saved.getId() + ".pdf");
    }
}
