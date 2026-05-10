package com.hospital.backend.controller;

import com.hospital.backend.entity.Role;
import com.hospital.backend.entity.User;
import com.hospital.backend.entity.Department;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.repository.DepartmentRepository;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.repository.PatientRepository;
import com.hospital.backend.service.ActivityService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
@Slf4j
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private ActivityService activityService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final String UPLOAD_DIR = "uploads/profiles/";

    // ========================= LECTURE =========================

    @GetMapping("/users/all")
    public ResponseEntity<List<User>> getAllUsers() {
        try {
            return ResponseEntity.ok(userRepository.findAll());
        } catch (Exception e) {
            log.error("Erreur liste utilisateurs", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/doctors/all")
    public ResponseEntity<?> getAllDoctors() {
        try {
            return roleRepository.findByNom("DOCTEUR").map(role -> {
                List<User> doctors = userRepository.findByRole(role);
                List<Map<String, Object>> response = doctors.stream().map(doc -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", doc.getId());
                    map.put("firstName", doc.getFirstName());
                    map.put("lastName", doc.getLastName());
                    map.put("specialty", doc.getDepartment() != null ? doc.getDepartment().getNom() : "Médecine Générale");
                    return map;
                }).toList();
                return ResponseEntity.ok(response);
            }).orElse(ResponseEntity.ok(Collections.emptyList()));
        } catch (Exception e) {
            log.error("Erreur récupération médecins", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getGlobalStats() {
        Map<String, Object> stats = new HashMap<>();
        try {
            stats.put("utilisateursTotal", userRepository.count());
            roleRepository.findByNom("DOCTEUR").ifPresent(r -> stats.put("docteurs", userRepository.countByRole(r)));
            roleRepository.findByNom("PATIENT").ifPresent(r -> stats.put("patients", userRepository.countByRole(r)));
            stats.put("departements", departmentRepository.count());
        } catch (Exception e) {
            log.error("Erreur statistiques", e);
        }
        return ResponseEntity.ok(stats);
    }

    // ========================= CRÉATION =========================

    @PostMapping("/users/create")
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> userData) {
        try {
            User user = new User();
            user.setFirstName((String) userData.get("firstName"));
            user.setLastName((String) userData.get("lastName"));
            user.setEmail((String) userData.get("email"));
            user.setUsername((String) userData.get("email"));
            user.setPhoneNumber((String) userData.get("phoneNumber"));
            user.setPassword(passwordEncoder.encode("Default123!"));
            user.setIsActive(true);

            String deptNom = (String) userData.get("departement");
            if (deptNom != null && !deptNom.isEmpty()) {
                departmentRepository.findByNom(deptNom).ifPresent(user::setDepartment);
            }

            String roleName = (String) userData.get("role");
            String searchName = (roleName == null || roleName.trim().isEmpty()) ? "PATIENT" : roleName.trim().toUpperCase();

            roleRepository.findByNom(searchName).ifPresentOrElse(
                    user::setRole,
                    () -> roleRepository.findByNom("PATIENT").ifPresent(user::setRole)
            );

            userRepository.save(user);
            activityService.log("Création", "Utilisateur: " + user.getFirstName() + " créé", "success");

            return ResponseEntity.ok(Map.of("message", "Utilisateur créé avec succès"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ========================= MISES À JOUR =========================

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> userDetails) {
        try {
            return userRepository.findById(id).map(user -> {
                user.setFirstName((String) userDetails.get("firstName"));
                user.setLastName((String) userDetails.get("lastName"));
                user.setEmail((String) userDetails.get("email"));
                user.setPhoneNumber((String) userDetails.get("phoneNumber"));

                if (userDetails.get("isActive") != null) {
                    user.setIsActive((Boolean) userDetails.get("isActive"));
                }

                String deptNom = (String) userDetails.get("departement");
                if (deptNom != null) {
                    departmentRepository.findByNom(deptNom).ifPresent(user::setDepartment);
                }

                String roleName = (String) userDetails.get("role");
                if (roleName != null) {
                    roleRepository.findByNom(roleName.toUpperCase()).ifPresent(user::setRole);
                }

                userRepository.save(user);
                return ResponseEntity.ok(Map.of("message", "Mis à jour avec succès"));
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            return userRepository.findById(id).map(user -> {
                userRepository.delete(user);
                return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé"));
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ========================= PROFIL & SÉCURITÉ =========================

    @PutMapping("/update-profile/{id}")
    @Transactional
    public ResponseEntity<?> updateMyProfile(@PathVariable Long id, @RequestBody Map<String, Object> profileData) {
        try {
            return userRepository.findById(id).map(user -> {
                // Sauvegarder l'email actuel pour la recherche patient avant toute modif
                String originalEmail = user.getEmail();

                // 1. Extraction flexible
                String firstName = profileData.get("prenom") != null ? (String) profileData.get("prenom") : (String) profileData.get("firstName");
                String lastName = profileData.get("nom") != null ? (String) profileData.get("nom") : (String) profileData.get("lastName");
                String phone = profileData.get("telephone") != null ? (String) profileData.get("telephone") : (String) profileData.get("phoneNumber");
                String blood = profileData.get("bloodType") != null ? (String) profileData.get("bloodType") : (String) profileData.get("groupeSanguin");
                String addr = profileData.get("address") != null ? (String) profileData.get("address") : (String) profileData.get("adresse");
                String dob = profileData.get("dateOfBirth") != null ? (String) profileData.get("dateOfBirth") : (String) profileData.get("dateNaissance");

                // 2. Application sur User
                if (firstName != null) user.setFirstName(firstName);
                if (lastName != null) user.setLastName(lastName);
                if (phone != null) user.setPhoneNumber(phone);
                if (blood != null) user.setBloodType(blood);
                if (addr != null) user.setAddress(addr);
                if (dob != null) user.setDateOfBirth(dob);

                // 3. Gestion Photo (Base64)
                String photoData = (String) profileData.get("photoUrl");
                if (photoData != null && photoData.startsWith("data:image")) {
                    try {
                        String fileName = saveBase64Image(id, photoData);
                        user.setPhotoUrl(fileName);
                    } catch (IOException e) {
                        log.error("Erreur enregistrement photo", e);
                    }
                }

                // Sauvegarder d'abord l'utilisateur
                User savedUser = userRepository.save(user);

                // 4. 🔄 SYNCHRONISATION PATIENT (Sécurisée)
                try {
                    patientRepository.findByEmail(originalEmail).ifPresent(patient -> {
                        patient.setFirstName(savedUser.getFirstName());
                        patient.setLastName(savedUser.getLastName());
                        patient.setBloodType(savedUser.getBloodType());
                        patient.setAddress(savedUser.getAddress());
                        patient.setPhoneNumber(savedUser.getPhoneNumber());

                        if (savedUser.getDateOfBirth() != null && !savedUser.getDateOfBirth().isEmpty()) {
                            try {
                                patient.setDateOfBirth(LocalDate.parse(savedUser.getDateOfBirth()));
                            } catch (DateTimeParseException e) {
                                log.warn("Format date invalide pour synchro patient : {}", savedUser.getDateOfBirth());
                            }
                        }

                        if (savedUser.getPhotoUrl() != null) {
                            patient.setPhotoUrl(savedUser.getPhotoUrl());
                        }

                        patientRepository.save(patient);
                        log.info("🔄 Synchro Patient réussie pour : {}", originalEmail);
                    });
                } catch (Exception e) {
                    log.error("⚠️ Échec partiel : Synchro patient impossible, mais User mis à jour : {}", e.getMessage());
                }

                return ResponseEntity.ok(Map.of("message", "Profil mis à jour", "user", savedUser));
            }).orElse(ResponseEntity.status(404).body(Map.of("error", "Utilisateur non trouvé")));
        } catch (Exception e) {
            log.error("❌ Erreur critique lors de update-profile : ", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    private String saveBase64Image(Long userId, String base64Content) throws IOException {
        Path path = Paths.get(UPLOAD_DIR);
        if (!Files.exists(path)) Files.createDirectories(path);
        String[] parts = base64Content.split(",");
        String imageString = parts.length > 1 ? parts[1] : parts[0];
        byte[] imageBytes = Base64.getDecoder().decode(imageString);
        String fileName = "profile_" + userId + "_" + System.currentTimeMillis() + ".jpg";
        try (FileOutputStream fos = new FileOutputStream(UPLOAD_DIR + fileName)) {
            fos.write(imageBytes);
        }
        return fileName;
    }

    @PostMapping("/upload-photo/{id}")
    @Transactional
    public ResponseEntity<?> uploadPhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            return userRepository.findById(id).map(user -> {
                try {
                    Path uploadPath = Paths.get(UPLOAD_DIR);
                    if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);
                    String fileName = "profile_" + id + "_" + System.currentTimeMillis() + ".jpg";
                    Files.copy(file.getInputStream(), uploadPath.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);
                    user.setPhotoUrl(fileName);
                    userRepository.save(user);
                    patientRepository.findByEmail(user.getEmail()).ifPresent(p -> {
                        p.setPhotoUrl(fileName);
                        patientRepository.save(p);
                    });
                    return ResponseEntity.ok(Map.of("photoUrl", fileName));
                } catch (IOException e) {
                    return ResponseEntity.status(500).body("Erreur fichier");
                }
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, Object> passwordData) {
        try {
            Long userId = Long.valueOf(passwordData.get("adminId").toString());
            String newPassword = (String) passwordData.get("newPassword");
            return userRepository.findById(userId).map(user -> {
                user.setPassword(passwordEncoder.encode(newPassword));
                userRepository.save(user);
                return ResponseEntity.ok(Map.of("message", "MDP mis à jour"));
            }).orElse(ResponseEntity.status(404).build());
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
}