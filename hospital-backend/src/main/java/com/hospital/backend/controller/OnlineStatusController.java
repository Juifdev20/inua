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
    public ResponseEntity<?> getMyDoctorsV2(Authentication authentication) {
        try {
            User currentUser = userRepository.findByEmail(authentication.getName())
                    .or(() -> userRepository.findByUsername(authentication.getName()))
                    .orElse(null);

            if (currentUser == null) {
                return ResponseEntity.status(404).body("Utilisateur non trouvé");
            }

            Optional<Patient> patientProfile = patientRepository.findByEmail(currentUser.getEmail());

            List<Consultation> consultations = new ArrayList<>();
            if (patientProfile.isPresent()) {
                consultations = consultationRepository.findByPatientIdOrderByConsultationDateDesc(patientProfile.get().getId());
            }

            Map<Long, Map<String, Object>> uniqueDoctors = new LinkedHashMap<>();
            for (Consultation c : consultations) {
                User doctor = c.getDoctor();
                if (doctor != null && !uniqueDoctors.containsKey(doctor.getId())) {
                    Map<String, Object> docData = new HashMap<>();
                    docData.put("id", doctor.getId());
                    docData.put("prenom", doctor.getFirstName());
                    docData.put("nom", doctor.getLastName());
                    docData.put("email", doctor.getEmail());
                    docData.put("displayFullName", doctor.getFirstName() + " " + doctor.getLastName());
                    docData.put("specialite", (doctor.getDepartment() != null) ? doctor.getDepartment().getNom() : "Médecin");
                    docData.put("photo", doctor.getPhotoUrl());
                    docData.put("en_ligne", doctor.getIsOnline() != null ? doctor.getIsOnline() : false);
                    uniqueDoctors.put(doctor.getId(), docData);
                }
            }
            return ResponseEntity.ok(new ArrayList<>(uniqueDoctors.values()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erreur: " + e.getMessage());
        }
    }
}
