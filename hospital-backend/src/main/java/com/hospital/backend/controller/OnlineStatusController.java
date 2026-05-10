package com.hospital.backend.controller;

import com.hospital.backend.entity.Consultation;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.ConsultationRepository;
import com.hospital.backend.repository.PatientRepository;
import com.hospital.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class OnlineStatusController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private ConsultationRepository consultationRepository;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(OnlineStatusController.class);

    @PostMapping("/status/online")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> setOnline(Authentication authentication) {
        try {
            User currentUser = userRepository.findByEmail(authentication.getName())
                    .or(() -> userRepository.findByUsername(authentication.getName()))
                    .orElse(null);

            if (currentUser == null) {
                return ResponseEntity.status(404).body("Utilisateur non trouvé");
            }

            currentUser.setIsOnline(true);
            currentUser.setLastSeen(LocalDateTime.now());
            userRepository.save(currentUser);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("isOnline", true);
            response.put("lastSeen", currentUser.getLastSeen());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erreur: " + e.getMessage());
        }
    }

    @PostMapping("/status/offline")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> setOffline(Authentication authentication) {
        try {
            User currentUser = userRepository.findByEmail(authentication.getName())
                    .or(() -> userRepository.findByUsername(authentication.getName()))
                    .orElse(null);

            if (currentUser == null) {
                return ResponseEntity.status(404).body("Utilisateur non trouvé");
            }

            currentUser.setIsOnline(false);
            currentUser.setLastSeen(LocalDateTime.now());
            userRepository.save(currentUser);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("isOnline", false);
            response.put("lastSeen", currentUser.getLastSeen());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erreur: " + e.getMessage());
        }
    }

    @GetMapping("/status/{userId}")
    public ResponseEntity<?> getUserStatus(@PathVariable Long userId) {
        try {
            User user = userRepository.findById(userId).orElse(null);

            if (user == null) {
                return ResponseEntity.status(404).body("Utilisateur non trouvé");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("userId", user.getId());
            response.put("isOnline", user.getIsOnline() != null ? user.getIsOnline() : false);
            response.put("lastSeen", user.getLastSeen());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erreur: " + e.getMessage());
        }
    }

    @GetMapping("/online-status/my-doctors")
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyDoctorsV2(Authentication authentication) {
        try {
            log.info("📱 [MY-DOCTORS] Récupération des médecins pour le patient connecté");
            
            User currentUser = userRepository.findByEmail(authentication.getName())
                    .or(() -> userRepository.findByUsername(authentication.getName()))
                    .orElse(null);

            if (currentUser == null) {
                log.warn("⚠️ [MY-DOCTORS] Utilisateur non trouvé: {}", authentication.getName());
                return ResponseEntity.status(404).body("Utilisateur non trouvé");
            }
            
            log.info("👤 [MY-DOCTORS] Utilisateur trouvé: {} (ID: {})", currentUser.getEmail(), currentUser.getId());

            Optional<Patient> patientProfile = patientRepository.findByEmail(currentUser.getEmail());

            List<Consultation> consultations = new ArrayList<>();
            if (patientProfile.isPresent()) {
                log.info("🏥 [MY-DOCTORS] Profil patient trouvé: ID {}", patientProfile.get().getId());
                consultations = consultationRepository.findByPatientIdOrderByConsultationDateDesc(patientProfile.get().getId());
                log.info("📋 [MY-DOCTORS] {} consultations trouvées", consultations.size());
            } else {
                log.warn("⚠️ [MY-DOCTORS] Profil patient non trouvé pour l'email: {}", currentUser.getEmail());
            }

            Map<Long, Map<String, Object>> uniqueDoctors = new LinkedHashMap<>();
            for (Consultation c : consultations) {
                User doctor = c.getDoctor();
                if (doctor != null && !uniqueDoctors.containsKey(doctor.getId())) {
                    log.info("👨‍⚕️ [MY-DOCTORS] Ajout du médecin: {} {} (ID: {})", 
                        doctor.getFirstName(), doctor.getLastName(), doctor.getId());
                    Map<String, Object> docData = new HashMap<>();
                    docData.put("id", doctor.getId());
                    docData.put("prenom", doctor.getFirstName());
                    docData.put("nom", doctor.getLastName());
                    docData.put("email", doctor.getEmail());
                    docData.put("displayFullName", doctor.getFirstName() + " " + doctor.getLastName());
                    
                    // Handle department with null check
                    String specialite = "Médecin";
                    if (doctor.getDepartment() != null && doctor.getDepartment().getNom() != null) {
                        specialite = doctor.getDepartment().getNom();
                    }
                    docData.put("specialite", specialite);
                    docData.put("photo", doctor.getPhotoUrl());
                    docData.put("en_ligne", doctor.getIsOnline() != null ? doctor.getIsOnline() : false);
                    uniqueDoctors.put(doctor.getId(), docData);
                }
            }
            
            log.info("✅ [MY-DOCTORS] {} médecins uniques retournés", uniqueDoctors.size());
            return ResponseEntity.ok(new ArrayList<>(uniqueDoctors.values()));
        } catch (Exception e) {
            log.error("❌ [MY-DOCTORS] Erreur lors de la récupération des médecins: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Erreur: " + e.getMessage());
        }
    }
}
