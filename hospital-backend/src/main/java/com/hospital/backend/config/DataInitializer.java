package com.hospital.backend.config;

import com.hospital.backend.entity.Role;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * Initialise les données de base au démarrage de l'application
 * Crée les rôles et un utilisateur admin par défaut si inexistant
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("🚀 Initialisation des données de base...");
        
        initializeRoles();
        initializeAdminUser();
        initializeDoctorUser();
        
        log.info("✅ Initialisation terminée!");
    }

    private void initializeRoles() {
        List<String> roleNames = Arrays.asList(
            "ROLE_ADMIN",
            "ROLE_DOCTEUR", 
            "ROLE_PATIENT",
            "ROLE_RECEPTION",
            "ROLE_FINANCE",
            "ROLE_CAISSIER",
            "ROLE_PHARMACIE",
            "ROLE_PHARMACIST",
            "ROLE_LABORATOIRE",
            "ROLE_INFIRMIER"
        );

        for (String roleName : roleNames) {
            if (!roleRepository.existsByNom(roleName)) {
                Role role = Role.builder()
                    .nom(roleName)
                    .description(getRoleDescription(roleName))
                    .build();
                roleRepository.save(role);
                log.info("📌 Rôle créé: {}", roleName);
            }
        }
    }

    private String getRoleDescription(String roleName) {
        return switch (roleName) {
            case "ROLE_ADMIN" -> "Administrateur système avec tous les droits";
            case "ROLE_DOCTEUR" -> "Médecin - peut consulter et prescrire";
            case "ROLE_PATIENT" -> "Patient - peut prendre rendez-vous";
            case "ROLE_RECEPTION" -> "Réceptionniste - gère les admissions";
            case "ROLE_FINANCE" -> "Agent financier - gestion des factures";
            case "ROLE_CAISSIER" -> "Caissier - encaissement";
            case "ROLE_PHARMACIE", "ROLE_PHARMACIST" -> "Pharmacien - gestion des médicaments";
            case "ROLE_LABORATOIRE" -> "Technicien de laboratoire";
            case "ROLE_INFIRMIER" -> "Infirmier";
            default -> "Rôle utilisateur";
        };
    }

    private void initializeAdminUser() {
        String adminUsername = "admin";
        
        if (!userRepository.existsByUsername(adminUsername)) {
            Role adminRole = roleRepository.findByNom("ROLE_ADMIN")
                .orElseThrow(() -> new RuntimeException("Rôle ROLE_ADMIN non trouvé"));

            User admin = User.builder()
                .username(adminUsername)
                .email("admin@inuaafia.com")
                .password(passwordEncoder.encode("admin123"))
                .firstName("Admin")
                .lastName("System")
                .phoneNumber("+243000000000")
                .role(adminRole)
                .isActive(true)
                .notificationEnabled(true)
                .soundEnabled(true)
                .preferredLanguage("fr")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

            userRepository.save(admin);
            log.info("👤 Utilisateur admin créé: {} / Mot de passe: admin123", adminUsername);
        } else {
            log.info("👤 Utilisateur admin existe déjà");
        }
    }

    private void initializeDoctorUser() {
        String doctorUsername = "doctor";
        
        if (!userRepository.existsByUsername(doctorUsername)) {
            Role doctorRole = roleRepository.findByNom("ROLE_DOCTEUR")
                .orElseThrow(() -> new RuntimeException("Rôle ROLE_DOCTEUR non trouvé"));

            User doctor = User.builder()
                .username(doctorUsername)
                .email("doctor@inuaafia.com")
                .password(passwordEncoder.encode("doctor123"))
                .firstName("Jean")
                .lastName("Dupont")
                .phoneNumber("+243000000001")
                .role(doctorRole)
                .isActive(true)
                .notificationEnabled(true)
                .soundEnabled(true)
                .preferredLanguage("fr")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

            userRepository.save(doctor);
            log.info("👨‍⚕️ Docteur créé: {} / Mot de passe: doctor123", doctorUsername);
        } else {
            log.info("👨‍⚕️ Docteur existe déjà");
        }
    }
}
