package com.hospital.backend.config;

import com.hospital.backend.entity.Gender;
import com.hospital.backend.entity.Hospital;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.Role;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.HospitalRepository;
import com.hospital.backend.repository.PatientRepository;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.service.HospitalConfigService;
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
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final HospitalConfigService hospitalConfigService;
    private final HospitalRepository hospitalRepository;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("🚀 Initialisation des données de base...");
        
        initializeRoles();
        initializeSuperAdminUser();
        initializeHospitalConfig();
        initializeAdminUser();
        initializeDoctorUser();
        initializeReceptionUser();
        initializeLaboUser();
        initializePharmacieUser();
        initializeFinanceUser();
        initializePatientUser();

        // 🏥 Migration mono→multi : rattache tout compte non-superadmin orphelin à l'hôpital principal.
        // Indispensable depuis le durcissement de l'isolation (JwtAuthenticationFilter / NO_TENANT) :
        // un non-superadmin sans hôpital ne verrait plus aucune donnée.
        backfillUsersHospital();

        log.info("✅ Initialisation terminée!");
    }

    private void backfillUsersHospital() {
        try {
            // Hôpital principal : le premier hôpital ACTIF (à défaut le premier existant),
            // sinon on en crée un par défaut.
            java.util.Comparator<Hospital> byId = (a, b) -> Long.compare(a.getId(), b.getId());
            Hospital defaultHospital = hospitalRepository.findAll().stream()
                    .filter(h -> Boolean.TRUE.equals(h.getIsActive()))
                    .min(byId)
                    .or(() -> hospitalRepository.findAll().stream().min(byId))
                    .orElseGet(() -> hospitalRepository.save(Hospital.builder()
                            .nom("Hôpital Principal")
                            .code("PRINCIPAL")
                            .isActive(true)
                            .registrationStatus("APPROVED")
                            .subscriptionPlan("STANDARD")
                            .maxUsers(100)
                            .build()));

            List<User> orphans = userRepository.findAll().stream()
                    .filter(u -> u.getHospital() == null)
                    .filter(u -> u.getRole() == null
                            || !u.getRole().getNom().replace("_", "").toUpperCase().contains("SUPERADMIN"))
                    .toList();

            if (!orphans.isEmpty()) {
                orphans.forEach(u -> u.setHospital(defaultHospital));
                userRepository.saveAll(orphans);
                log.info("🏥 {} utilisateur(s) sans hôpital rattaché(s) à '{}' (id {})",
                        orphans.size(), defaultHospital.getNom(), defaultHospital.getId());
            }
        } catch (Exception e) {
            log.warn("⚠️ Backfill hôpital des utilisateurs ignoré: {}", e.getMessage());
        }
    }
    
    private void initializeHospitalConfig() {
        try {
            if (!hospitalConfigService.exists()) {
                var config = hospitalConfigService.initializeDefault();
                if (config != null) {
                    log.info("🏥 Configuration hospitalière initialisée");
                }
            } else {
                log.info("🏥 Configuration hospitalière existe déjà");
            }
        } catch (Exception e) {
            log.warn("⚠️ Table hospital_config non disponible (premier démarrage), ignoré");
        }
    }

    private void initializeRoles() {
        List<String> roleNames = Arrays.asList(
            "ROLE_SUPERADMIN",
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

    private void initializeSuperAdminUser() {
        String superAdminUsername = "superadmin";

        Role superAdminRole = roleRepository.findByNom("ROLE_SUPERADMIN")
            .orElseThrow(() -> new RuntimeException("Rôle ROLE_SUPERADMIN non trouvé"));

        User existingUser = userRepository.findByUsername(superAdminUsername).orElse(null);
        if (existingUser == null) {
            User superAdmin = User.builder()
                .username(superAdminUsername)
                .email("superadmin@inuaafia.com")
                .password(passwordEncoder.encode("admin123"))
                .firstName("Super")
                .lastName("Admin")
                .phoneNumber("+243000000000")
                .role(superAdminRole)
                .isActive(true)
                .notificationEnabled(true)
                .soundEnabled(true)
                .preferredLanguage("fr")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

            userRepository.save(superAdmin);
            log.info("🛡️ Utilisateur super admin créé: {} / Mot de passe: admin123", superAdminUsername);
        } else {
            // Forcer la mise à jour du mot de passe (corrige anciens hash invalides)
            existingUser.setPassword(passwordEncoder.encode("admin123"));
            existingUser.setRole(superAdminRole);
            existingUser.setUpdatedAt(LocalDateTime.now());
            userRepository.save(existingUser);
            log.info("🛡️ Mot de passe super admin mis à jour: {} / Mot de passe: admin123", superAdminUsername);
        }
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
            // Mettre à jour le mot de passe de l'admin existant pour s'assurer qu'est encodé correctement
            User existingAdmin = userRepository.findByUsername(adminUsername).orElse(null);
            if (existingAdmin != null) {
                existingAdmin.setPassword(passwordEncoder.encode("admin123"));
                existingAdmin.setUpdatedAt(LocalDateTime.now());
                userRepository.save(existingAdmin);
                log.info("👤 Mot de passe admin mis à jour: {} / Mot de passe: admin123", adminUsername);
            }
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

    private void initializeReceptionUser() {
        String username = "reception";
        if (!userRepository.existsByUsername(username)) {
            Role role = roleRepository.findByNom("ROLE_RECEPTION")
                .orElseThrow(() -> new RuntimeException("Rôle ROLE_RECEPTION non trouvé"));
            User user = User.builder()
                .username(username)
                .email("reception@inuaafia.com")
                .password(passwordEncoder.encode("reception123"))
                .firstName("Marie")
                .lastName("Reception")
                .phoneNumber("+243000000002")
                .role(role)
                .isActive(true)
                .notificationEnabled(true)
                .soundEnabled(true)
                .preferredLanguage("fr")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
            userRepository.save(user);
            log.info("📋 Réception créée: {} / Mot de passe: reception123", username);
        } else {
            log.info("📋 Réception existe déjà");
        }
    }

    private void initializeLaboUser() {
        String username = "labo";
        if (!userRepository.existsByUsername(username)) {
            Role role = roleRepository.findByNom("ROLE_LABORATOIRE")
                .orElseThrow(() -> new RuntimeException("Rôle ROLE_LABORATOIRE non trouvé"));
            User user = User.builder()
                .username(username)
                .email("labo@inuaafia.com")
                .password(passwordEncoder.encode("labo123"))
                .firstName("Tech")
                .lastName("Laboratoire")
                .phoneNumber("+243000000003")
                .role(role)
                .isActive(true)
                .notificationEnabled(true)
                .soundEnabled(true)
                .preferredLanguage("fr")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
            userRepository.save(user);
            log.info("🔬 Labo créé: {} / Mot de passe: labo123", username);
        } else {
            log.info("🔬 Labo existe déjà");
        }
    }

    private void initializePharmacieUser() {
        String username = "pharmacie";
        if (!userRepository.existsByUsername(username)) {
            Role role = roleRepository.findByNom("ROLE_PHARMACIE")
                .orElseThrow(() -> new RuntimeException("Rôle ROLE_PHARMACIE non trouvé"));
            User user = User.builder()
                .username(username)
                .email("pharmacie@inuaafia.com")
                .password(passwordEncoder.encode("pharmacie123"))
                .firstName("Pharma")
                .lastName("Pharmacien")
                .phoneNumber("+243000000004")
                .role(role)
                .isActive(true)
                .notificationEnabled(true)
                .soundEnabled(true)
                .preferredLanguage("fr")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
            userRepository.save(user);
            log.info("💊 Pharmacie créée: {} / Mot de passe: pharmacie123", username);
        } else {
            log.info("💊 Pharmacie existe déjà");
        }
    }

    private void initializeFinanceUser() {
        String username = "finance";
        if (!userRepository.existsByUsername(username)) {
            Role role = roleRepository.findByNom("ROLE_FINANCE")
                .orElseThrow(() -> new RuntimeException("Rôle ROLE_FINANCE non trouvé"));
            User user = User.builder()
                .username(username)
                .email("finance@inuaafia.com")
                .password(passwordEncoder.encode("finance123"))
                .firstName("Compta")
                .lastName("Finance")
                .phoneNumber("+243000000005")
                .role(role)
                .isActive(true)
                .notificationEnabled(true)
                .soundEnabled(true)
                .preferredLanguage("fr")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
            userRepository.save(user);
            log.info("💰 Finance créée: {} / Mot de passe: finance123", username);
        } else {
            log.info("💰 Finance existe déjà");
        }
    }

    private void initializePatientUser() {
        String username = "patient";
        String email = "patient@inuaafia.com";

        User user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            // Créer le User
            Role role = roleRepository.findByNom("ROLE_PATIENT")
                .orElseThrow(() -> new RuntimeException("Rôle ROLE_PATIENT non trouvé"));
            user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode("patient123"))
                .firstName("Jean")
                .lastName("Patient")
                .phoneNumber("+243000000006")
                .role(role)
                .isActive(true)
                .notificationEnabled(true)
                .soundEnabled(true)
                .preferredLanguage("fr")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
            user = userRepository.save(user);
            log.info("🏥 Utilisateur patient créé: {} / Mot de passe: patient123", username);
        }

        // Vérifier si le profil Patient existe pour ce user, sinon le créer
        boolean patientExists = patientRepository.findByUser(user).isPresent();
        if (!patientExists) {
            Patient patient = Patient.builder()
                .user(user)
                .patientCode("PAT-" + System.currentTimeMillis())
                .firstName("Jean")
                .lastName("Patient")
                .email(email)
                .phoneNumber("+243000000006")
                .gender(Gender.MASCULIN)
                .createdBy(user)
                .build();
            patientRepository.save(patient);
            log.info("🏥 Profil patient créé pour: {}", username);
        } else {
            log.info("🏥 Profil patient existe déjà");
        }
    }
}
