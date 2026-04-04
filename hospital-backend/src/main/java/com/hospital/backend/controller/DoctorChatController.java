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
@RequestMapping("/api/v1/doctors/chat")
@CrossOrigin(origins = "*")
public class DoctorChatController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private ConsultationRepository consultationRepository;

    /**
     * ✅ Liste des patients (Contacts)
     */
    @GetMapping("/my-patients")
    @PreAuthorize("hasAnyRole('DOCTEUR', 'DOCTOR')") // ✅ Supporte les deux variantes
    public ResponseEntity<?> getMyPatients(Authentication authentication) {
        try {
            User doctor = userRepository.findByEmail(authentication.getName())
                    .or(() -> userRepository.findByUsername(authentication.getName()))
                    .orElse(null);

            if (doctor == null) return ResponseEntity.status(404).body("Docteur non trouvé");

            List<Consultation> consultations = consultationRepository.findByDoctorId(doctor.getId());

            Map<Long, Map<String, Object>> uniquePatients = new LinkedHashMap<>();
            for (Consultation c : consultations) {
                Patient p = c.getPatient();
                if (p != null && p.getUser() != null) {
                    Long patientUserId = p.getUser().getId();
                    if (!uniquePatients.containsKey(patientUserId)) {
                        Map<String, Object> data = new HashMap<>();
                        data.put("id", patientUserId);
                        data.put("patientProfileId", p.getId());
                        data.put("nom", p.getLastName());
                        data.put("prenom", p.getFirstName());
                        data.put("photo", p.getPhotoUrl());
                        uniquePatients.put(patientUserId, data);
                    }
                }
            }
            return ResponseEntity.ok(new ArrayList<>(uniquePatients.values()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur: " + e.getMessage());
        }
    }

    /**
     * ✅ Récupérer la conversation
     */
    @GetMapping("/conversations/{patientUserId}")
    @PreAuthorize("hasAnyRole('DOCTEUR', 'DOCTOR')")
    public ResponseEntity<?> getConversation(@PathVariable Long patientUserId, Authentication authentication) {
        try {
            User doctor = userRepository.findByEmail(authentication.getName())
                    .or(() -> userRepository.findByUsername(authentication.getName()))
                    .orElse(null);

            if (doctor == null) return ResponseEntity.status(404).body("Docteur non trouvé");

            List<ChatMessage> messages = chatMessageRepository.findConversationBetween(doctor.getId(), patientUserId);

            // Marquer comme lu
            List<ChatMessage> toUpdate = messages.stream()
                    .filter(m -> !m.isRead() && m.getReceiver().getId().equals(doctor.getId()))
                    .peek(m -> m.setRead(true))
                    .collect(Collectors.toList());

            if (!toUpdate.isEmpty()) {
                chatMessageRepository.saveAll(toUpdate);
            }

            return ResponseEntity.ok(messages.stream().map(m -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", m.getId());
                map.put("contenu", m.getContent());
                map.put("sender_type", m.getSender().getId().equals(doctor.getId()) ? "doctor" : "patient");
                map.put("created_at", m.getCreatedAt());
                map.put("lu", m.isRead());
                return map;
            }).collect(Collectors.toList()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur: " + e.getMessage());
        }
    }

    /**
     * ✅ Envoyer un message (Réponse au patient)
     */
    @PostMapping("/send")
    @PreAuthorize("hasAnyRole('DOCTEUR', 'DOCTOR')")
    public ResponseEntity<?> replyToPatient(@RequestBody Map<String, Object> payload, Authentication authentication) {
        try {
            User doctor = userRepository.findByEmail(authentication.getName())
                    .or(() -> userRepository.findByUsername(authentication.getName()))
                    .orElse(null);

            // ✅ Sécurisation de l'ID (Accepte "patientUserId" ou "receiverId")
            Object idObj = payload.get("patientUserId") != null ? payload.get("patientUserId") : payload.get("receiverId");
            if (idObj == null) return ResponseEntity.badRequest().body("ID du patient manquant");

            Long patientUserId = Long.valueOf(idObj.toString());
            User patientUser = userRepository.findById(patientUserId).orElse(null);

            if (doctor == null || patientUser == null) {
                return ResponseEntity.status(404).body("Interlocuteur introuvable");
            }

            ChatMessage message = ChatMessage.builder()
                    .sender(doctor)
                    .receiver(patientUser)
                    .content(payload.get("contenu").toString())
                    .createdAt(LocalDateTime.now())
                    .isRead(false)
                    .build();

            ChatMessage saved = chatMessageRepository.save(message);

            return ResponseEntity.ok(Map.of(
                    "id", saved.getId(),
                    "contenu", saved.getContent(),
                    "sender_type", "doctor",
                    "created_at", saved.getCreatedAt(),
                    "lu", false
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erreur envoi: " + e.getMessage());
        }
    }
}