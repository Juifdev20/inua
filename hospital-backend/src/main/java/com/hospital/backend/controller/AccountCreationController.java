package com.hospital.backend.controller;

import com.hospital.backend.dto.UserDTO;
import com.hospital.backend.entity.Role;
import com.hospital.backend.entity.User;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.Department;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.repository.PatientRepository;
import com.hospital.backend.repository.DepartmentRepository;
import com.hospital.backend.service.ActivityService;
import com.hospital.backend.util.AccountGenerationUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * ★ CONTRÔLEUR POUR LA CRÉATION AUTOMATIQUE DE COMPTES UTILISATEURS
 * Génère automatiquement username et mot de passe pour patients et staff
 */
@RestController
@RequestMapping("/api/account-creation")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Account Creation", description = "Création automatique de comptes utilisateurs")
public class AccountCreationController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PatientRepository patientRepository;
    private final DepartmentRepository departmentRepository;
    private final AccountGenerationUtils accountGenerationUtils;
    private final PasswordEncoder passwordEncoder;
    private final ActivityService activityService;

    // Mot de passe par défaut
    private static final String DEFAULT_PASSWORD = AccountGenerationUtils.DEFAULT_PASSWORD;

    /**
     * ★ CRÉATION D'UN UTILISATEUR STAFF (Admin)
     * Génère automatiquement username et mot de passe
     */
    @PostMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Créer un compte staff avec identifiants auto-générés")
    @Transactional
    public ResponseEntity<?> createStaffAccount(@RequestBody Map<String, Object> userData) {
        try {
            log.info("🆕 [ADMIN] Création compte staff pour: {} {}",
                    userData.get("firstName"), userData.get("lastName"));

            // 1. Générer un username unique
            String firstName = (String) userData.get("firstName");
            String lastName = (String) userData.get("lastName");
            String generatedUsername = accountGenerationUtils.generateUniqueUsername(firstName, lastName);

            // 2. Créer l'utilisateur
            User user = new User();
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setUsername(generatedUsername);

            // Email : fourni ou généré par défaut
            String email = (String) userData.get("email");
            user.setEmail(email != null && !email.isEmpty() ? email
                    : accountGenerationUtils.generateDefaultEmail(generatedUsername));

            // Valider l'email et vérifier s'il existe déjà
            if (email != null && !email.isEmpty()) {
                if (!isValidEmail(email)) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "success", false,
                            "error", "Format d'email invalide"
                    ));
                }
                if (userRepository.findByEmail(email).isPresent()) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "success", false,
                            "error", "Cet email est déjà utilisé par un autre compte"
                    ));
                }
            }

            // Téléphone
            user.setPhoneNumber((String) userData.get("phoneNumber"));

            // Mot de passe par défaut hashé
            user.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
            user.setMustChangePassword(true); // Force changement au premier login
            user.setIsActive(true);

            // Département
            String deptNom = (String) userData.get("departement");
            if (deptNom != null && !deptNom.isEmpty()) {
                departmentRepository.findByNom(deptNom).ifPresent(user::setDepartment);
            }

            // Rôle
            String roleName = (String) userData.get("role");
            String searchName = (roleName == null || roleName.trim().isEmpty())
                    ? "ROLE_PATIENT" : "ROLE_" + roleName.trim().toUpperCase();

            // 🛡️ BLOCAGE SÉCURITÉ : un admin hospitalier ne peut PAS créer de SUPERADMIN
            if ("ROLE_SUPERADMIN".equals(searchName)) {
                log.warn("🚨 [SECURITE] Tentative d'assignation ROLE_SUPERADMIN bloquée par AccountCreationController");
                searchName = "ROLE_PATIENT";
            }

            roleRepository.findByNom(searchName).ifPresent(user::setRole);

            // Sauvegarder
            User savedUser = userRepository.save(user);

            // Logger l'activité
            activityService.log("Création Compte",
                    "Staff: " + firstName + " " + lastName + " (" + generatedUsername + ")",
                    "success");

            log.info("✅ [ADMIN] Compte staff créé: {} | ID: {}", generatedUsername, savedUser.getId());

            // Réponse avec credentials générés
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Compte créé avec succès");
            response.put("username", generatedUsername);
            response.put("generatedPassword", DEFAULT_PASSWORD);
            response.put("userId", savedUser.getId());
            response.put("mustChangePassword", true);
            response.put("user", Map.of(
                    "id", savedUser.getId(),
                    "firstName", savedUser.getFirstName(),
                    "lastName", savedUser.getLastName(),
                    "username", savedUser.getUsername(),
                    "email", savedUser.getEmail()
            ));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ [ADMIN] Erreur création compte staff: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", "Erreur lors de la création du compte: " + e.getMessage()
            ));
        }
    }

    /**
     * ★ CRÉATION D'UN COMPTE PATIENT (Réception)
     * Génère automatiquement username et mot de passe, lie au patient
     */
    @PostMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('RECEPTION', 'ADMIN')")
    @Operation(summary = "Créer un compte utilisateur pour un patient existant")
    @Transactional
    public ResponseEntity<?> createPatientAccount(@PathVariable Long patientId) {
        log.info("🔥 [RECEPTION] ========== MÉTHODE APPELÉE ==========");
        log.info("🔥 [RECEPTION] Patient ID reçu: {}", patientId);
        try {
            log.info("🆕 [RECEPTION] Création compte pour patient ID: {}", patientId);

            // Vérifier que le patient existe
            Optional<Patient> patientOpt = patientRepository.findById(patientId);
            if (patientOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of(
                        "success", false,
                        "error", "Patient non trouvé"
                ));
            }

            Patient patient = patientOpt.get();

            // Vérifier si le patient a déjà un compte utilisateur
            if (patient.getUser() != null) {
                log.warn("⚠️ [RECEPTION] Patient {} a déjà un compte: {}", patientId, patient.getUser().getUsername());
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Ce patient possède déjà un compte utilisateur",
                        "existingUsername", patient.getUser().getUsername()
                ));
            }

            log.info("📝 [RECEPTION] Patient trouvé: {} {}, email: {}, phone: {}",
                    patient.getFirstName(), patient.getLastName(),
                    patient.getEmail(), patient.getPhoneNumber());

            // Générer username
            String firstName = patient.getFirstName();
            String lastName = patient.getLastName();
            String generatedUsername;

            // Si nom/prénom insuffisants, utiliser le téléphone
            if ((firstName == null || firstName.trim().isEmpty())
                    && (lastName == null || lastName.trim().isEmpty())) {
                generatedUsername = accountGenerationUtils.generateUsernameFromPhone(patient.getPhoneNumber());
            } else {
                generatedUsername = accountGenerationUtils.generateUniqueUsername(
                        firstName != null ? firstName : "",
                        lastName != null ? lastName : ""
                );
            }

            // Créer l'utilisateur
            User user = new User();
            user.setFirstName(firstName != null ? firstName : "Patient");
            user.setLastName(lastName != null ? lastName : "");
            user.setUsername(generatedUsername);

            // Email : patient ou généré
            String email = patient.getEmail();
            user.setEmail(email != null && !email.isEmpty() ? email
                    : accountGenerationUtils.generateDefaultEmail(generatedUsername));

            // Valider l'email et vérifier s'il existe déjà
            if (email != null && !email.isEmpty()) {
                if (!isValidEmail(email)) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "success", false,
                            "error", "Format d'email invalide"
                    ));
                }
                if (userRepository.findByEmail(email).isPresent()) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "success", false,
                            "error", "Cet email est déjà utilisé par un autre compte"
                    ));
                }
            }

            // Téléphone
            user.setPhoneNumber(patient.getPhoneNumber());

            // Mot de passe par défaut
            user.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
            user.setMustChangePassword(true);
            user.setIsActive(true);

            // Rôle PATIENT
            Optional<Role> patientRoleOpt = roleRepository.findByNom("ROLE_PATIENT");
            if (patientRoleOpt.isPresent()) {
                user.setRole(patientRoleOpt.get());
                log.info("✅ [RECEPTION] Rôle PATIENT assigné");
            } else {
                log.error("❌ [RECEPTION] Rôle ROLE_PATIENT non trouvé en base!");
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Configuration invalide: rôle patient non trouvé"
                ));
            }

            log.info("📝 [RECEPTION] Création utilisateur: username={}, firstName={}, lastName={}",
                    generatedUsername, firstName, lastName);

            // Sauvegarder l'utilisateur
            User savedUser = userRepository.save(user);

            // Lier le patient à l'utilisateur
            patient.setUser(savedUser);
            patientRepository.save(patient);

            // Logger
            activityService.log("Création Compte Patient",
                    "Patient: " + patient.getFirstName() + " " + patient.getLastName()
                            + " (" + generatedUsername + ")",
                    "success");

            log.info("✅ [RECEPTION] Compte patient créé: {} | Patient ID: {}",
                    generatedUsername, patientId);

            // Réponse
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Compte patient créé avec succès");
            response.put("username", generatedUsername);
            response.put("generatedPassword", DEFAULT_PASSWORD);
            response.put("userId", savedUser.getId());
            response.put("patientId", patientId);
            response.put("mustChangePassword", true);
            response.put("patient", Map.of(
                    "id", patient.getId(),
                    "firstName", patient.getFirstName(),
                    "lastName", patient.getLastName(),
                    "phoneNumber", patient.getPhoneNumber()
            ));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur création compte patient: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", "Erreur lors de la création du compte: " + e.getMessage()
            ));
        }
    }

    /**
     * ★ VÉRIFICATION DISPONIBILITÉ USERNAME
     */
    @GetMapping("/check-username")
    @Operation(summary = "Vérifier si un username existe déjà")
    public ResponseEntity<?> checkUsernameAvailability(@RequestParam String username) {
        boolean exists = accountGenerationUtils.usernameExists(username);
        return ResponseEntity.ok(Map.of(
                "available", !exists,
                "username", username
        ));
    }

    /**
     * ★ PRÉVISUALISATION USERNAME
     * Génère un username sans le sauvegarder (pour affichage dans le formulaire)
     */
    @GetMapping("/preview-username")
    @Operation(summary = "Prévisualiser le username qui sera généré")
    public ResponseEntity<?> previewUsername(
            @RequestParam String firstName,
            @RequestParam String lastName) {

        String baseUsername = generateBaseUsername(firstName, lastName);

        return ResponseEntity.ok(Map.of(
                "preview", baseUsername,
                "suggestion", baseUsername + "1",
                "available", !accountGenerationUtils.usernameExists(baseUsername)
        ));
    }

    private String generateBaseUsername(String firstName, String lastName) {
        if (firstName == null) firstName = "user";
        if (lastName == null) lastName = "unknown";

        String normalizedFirst = firstName.toLowerCase()
                .replaceAll("[éèêë]", "e")
                .replaceAll("[àâä]", "a")
                .replaceAll("[îï]", "i")
                .replaceAll("[ôö]", "o")
                .replaceAll("[ùûü]", "u")
                .replaceAll("ç", "c")
                .replaceAll("[^a-z0-9]", "");

        String normalizedLast = lastName.toLowerCase()
                .replaceAll("[éèêë]", "e")
                .replaceAll("[àâä]", "a")
                .replaceAll("[îï]", "i")
                .replaceAll("[ôö]", "o")
                .replaceAll("[ùûü]", "u")
                .replaceAll("ç", "c")
                .replaceAll("[^a-z0-9]", "");

        return normalizedFirst + "." + normalizedLast;
    }

    /**
     * Valide le format d'un email
     */
    private boolean isValidEmail(String email) {
        String emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
        return email.matches(emailRegex);
    }
}
