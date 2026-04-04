package com.hospital.backend.controller;

import com.hospital.backend.entity.*;
import com.hospital.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/patients")
@CrossOrigin(origins = "*")
public class PatientChatController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private ConsultationRepository consultationRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @GetMapping("/my-doctors")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> getMyDoctors(Authentication authentication) {
        try {
            User currentUser = userRepository.findByEmail(authentication.getName())
                    .or(() -> userRepository.findByUsername(authentication.getName()))
                    .orElse(null);

            if (currentUser == null) return ResponseEntity.status(404).body("Utilisateur non trouvé");

            Optional<Patient> patientProfile = patientRepository.findByEmail(currentUser.getEmail());

            // Correction : On s'assure d'utiliser l'ID du profil Patient pour les consultations
            List<Consultation> consultations = patientProfile.isPresent()
                    ? consultationRepository.findByPatientIdOrderByConsultationDateDesc(patientProfile.get().getId())
                    : new ArrayList<>();

            Map<Long, Map<String, Object>> uniqueDoctors = new LinkedHashMap<>();
            for (Consultation c : consultations) {
                User doctor = c.getDoctor();
                if (doctor != null && !uniqueDoctors.containsKey(doctor.getId())) {
                    Map<String, Object> docData = new HashMap<>();
                    docData.put("id", doctor.getId());
                    docData.put("prenom", doctor.getFirstName());
                    docData.put("nom", doctor.getLastName());
                    docData.put("specialite", (doctor.getDepartment() != null) ? doctor.getDepartment().getNom() : "Médecin");
                    docData.put("photo", doctor.getPhotoUrl());
                    uniqueDoctors.put(doctor.getId(), docData);
                }
            }
            return ResponseEntity.ok(new ArrayList<>(uniqueDoctors.values()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur: " + e.getMessage());
        }
    }

    @GetMapping("/conversations/{doctorId}")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> getConversation(@PathVariable Long doctorId, Authentication authentication) {
        try {
            User patientUser = userRepository.findByEmail(authentication.getName())
                    .or(() -> userRepository.findByUsername(authentication.getName()))
                    .orElse(null);

            if (patientUser == null) return ResponseEntity.status(404).body("Patient non trouvé");

            List<ChatMessage> messages = chatMessageRepository.findConversationBetween(patientUser.getId(), doctorId);

            // Marquer comme lu de manière plus efficiente
            List<ChatMessage> toUpdate = messages.stream()
                    .filter(m -> m.getReceiver().getId().equals(patientUser.getId()) && !m.isRead())
                    .peek(m -> m.setRead(true))
                    .collect(Collectors.toList());

            if (!toUpdate.isEmpty()) {
                chatMessageRepository.saveAll(toUpdate);
            }

            return ResponseEntity.ok(messages.stream().map(m -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", m.getId());
                map.put("contenu", m.getContent());
                map.put("sender_type", m.getSender().getId().equals(patientUser.getId()) ? "patient" : "doctor");
                map.put("created_at", m.getCreatedAt());
                map.put("lu", m.isRead());
                return map;
            }).collect(Collectors.toList()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur: " + e.getMessage());
        }
    }

    @PostMapping("/send")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, Object> payload, Authentication authentication) {
        System.out.println("DEBUG: Envoi de message par " + authentication.getName());
        try {
            // Sécurisation du Sender : Recherche par email OU username
            User sender = userRepository.findByEmail(authentication.getName())
                    .or(() -> userRepository.findByUsername(authentication.getName()))
                    .orElseThrow(() -> new RuntimeException("Expéditeur non trouvé"));

            // Sécurisation du DoctorId
            if (payload.get("doctorId") == null) {
                return ResponseEntity.badRequest().body("ID du docteur manquant");
            }

            Long doctorId = Long.valueOf(payload.get("doctorId").toString());
            User receiver = userRepository.findById(doctorId)
                    .orElseThrow(() -> new RuntimeException("Médecin non trouvé"));

            ChatMessage message = ChatMessage.builder()
                    .sender(sender)
                    .receiver(receiver)
                    .content((String) payload.get("contenu"))
                    .createdAt(LocalDateTime.now())
                    .isRead(false)
                    .build();

            ChatMessage saved = chatMessageRepository.save(message);

            // ✅ IMPORTANT : On renvoie l'objet complet pour que React puisse l'ajouter à la liste
            Map<String, Object> response = new HashMap<>();
            response.put("id", saved.getId());
            response.put("contenu", saved.getContent());
            response.put("sender_type", "patient");
            response.put("created_at", saved.getCreatedAt());
            response.put("lu", saved.isRead());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Erreur dans sendMessage: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erreur envoi: " + e.getMessage());
        }
    }
}