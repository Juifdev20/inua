package com.hospital.backend.controller;

import com.hospital.backend.entity.User;
import com.hospital.backend.entity.Role;
import com.hospital.backend.entity.Consultation;
import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.repository.PatientRepository;
import com.hospital.backend.repository.ConsultationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/doctors")
@CrossOrigin(origins = "*")
public class DoctorController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private ConsultationRepository consultationRepository;

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('DOCTEUR')")
    public ResponseEntity<Map<String, Object>> getDoctorDashboard(Authentication authentication) {
        // 1. Identification du docteur
        String identifier = authentication.getName();
        User doctorUser = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByUsername(identifier))
                .orElse(null);

        if (doctorUser == null) {
            return ResponseEntity.status(404).build();
        }

        Long doctorId = doctorUser.getId();
        String doctorEmail = doctorUser.getEmail();

        // Préparation des dates pour les statistiques du jour uniquement
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        Map<String, Object> response = new HashMap<>();
        Map<String, Object> stats = new HashMap<>();

        // 2. Statistiques (Gardées intactes pour le Dashboard)
        stats.put("total_patients", patientRepository.countByDoctorEmail(doctorEmail));

        // Garde le chiffre des rendez-vous d'aujourd'hui pour le badge
        stats.put("rdvs_today_count", consultationRepository.countTodayConsultationsByDoctorId(doctorId, startOfDay, endOfDay));

        // Les 6 en attente que vous voyez s'affichent ici car on ne filtre pas par date
        stats.put("consultations_pending", consultationRepository.countByDoctorIdAndStatus(doctorId, ConsultationStatus.EN_ATTENTE));

        stats.put("unread_messages", 0);
        response.put("stats", stats);

        // 3. LOGIQUE MODIFIÉE : On récupère TOUTES les consultations du docteur
        // On retire le filtre startOfDay/endOfDay pour que le frontend reçoive tout (les 6 en attente inclus)
        List<Consultation> allConsultations = consultationRepository.findByDoctorId(doctorId);

        List<Map<String, Object>> fullRdvsList = allConsultations.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("consultationDate", c.getConsultationDate());
            map.put("reasonForVisit", c.getReasonForVisit() != null ? c.getReasonForVisit() : "Consultation");
            map.put("status", c.getStatus().toString());

            if (c.getPatient() != null) {
                map.put("patientId", c.getPatient().getId());
                map.put("patientName", c.getPatient().getFirstName() + " " + c.getPatient().getLastName());

                Map<String, String> patientDetail = new HashMap<>();
                patientDetail.put("nom", c.getPatient().getLastName());
                patientDetail.put("prenom", c.getPatient().getFirstName());
                map.put("patient", patientDetail);
            }
            return map;
        }).collect(Collectors.toList());

        // On envoie la liste complète sous "rdvs_today" pour que votre React actuel l'affiche
        response.put("rdvs_today", fullRdvsList);

        // 4. Historique récent (5 derniers)
        List<Consultation> recent = consultationRepository.findRecentByDoctorId(doctorId, PageRequest.of(0, 5));
        response.put("recent_consultations", recent.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("consultationDate", c.getConsultationDate());
            map.put("patientName", c.getPatient() != null ? c.getPatient().getFirstName() + " " + c.getPatient().getLastName() : "Inconnu");
            map.put("diagnosis", c.getDiagnosis());
            return map;
        }).collect(Collectors.toList()));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/all")
    public ResponseEntity<List<Map<String, Object>>> getAllDoctors() {
        Optional<Role> doctorRole = roleRepository.findByNom("DOCTEUR")
                .or(() -> roleRepository.findByNom("ROLE_DOCTEUR"));

        if (doctorRole.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<User> doctors = userRepository.findByRole(doctorRole.get());

        return ResponseEntity.ok(doctors.stream()
                .filter(doc -> doc != null && Boolean.TRUE.equals(doc.getIsActive()))
                .map(doc -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", doc.getId());
                    map.put("firstName", doc.getFirstName());
                    map.put("lastName", doc.getLastName());
                    map.put("email", doc.getEmail());

                    String specialite = "Médecin Généraliste";
                    try {
                        if (doc.getDepartment() != null) {
                            specialite = doc.getDepartment().getNom().toUpperCase();
                        }
                    } catch (Exception e) {}

                    map.put("specialty", specialite);
                    map.put("photoUrl", doc.getPhotoUrl() != null ? doc.getPhotoUrl() : "");
                    return map;
                })
                .collect(Collectors.toList()));
    }

    @PostMapping("/add")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> addDoctor(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(Map.of("message", "Docteur configuré avec succès !"));
    }
}