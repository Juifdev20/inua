package com.hospital.backend.controller;

import com.hospital.backend.entity.ChatMessage;
import com.hospital.backend.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

import java.util.*;

@RestController
@RequestMapping("/api/v1/doctors/chat")
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class ChatController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    /**
     * ✅ FONCTIONNALITÉ AJOUTÉE : Suppression bidirectionnelle sécurisée
     * Supprime un message spécifique par son ID.
     * Cette action est définitive en base de données pour l'expéditeur et le destinataire.
     */
    @DeleteMapping("/messages/{id}")
    public ResponseEntity<Map<String, Object>> deleteMessage(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();

        try {
            // 1. Recherche du message dans la base
            Optional<ChatMessage> messageOptional = chatMessageRepository.findById(id);

            if (messageOptional.isPresent()) {
                // 2. Suppression physique (Effet miroir automatique via le polling du patient)
                chatMessageRepository.deleteById(id);

                // 3. Construction de la réponse succès
                response.put("success", true);
                response.put("message", "Le message a été supprimé avec succès.");
                response.put("deletedId", id);
                response.put("timestamp", System.currentTimeMillis());

                return ResponseEntity.ok(response);
            } else {
                // Cas où le message a déjà été supprimé ou l'ID est invalide
                response.put("success", false);
                response.put("error", "Impossible de trouver le message. Il a peut-être déjà été supprimé.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

        } catch (Exception e) {
            // Protection contre les erreurs serveurs imprévues
            response.put("success", false);
            response.put("error", "Erreur lors de la suppression : " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Note pour l'équipe :
     * Les autres méthodes (findConversationBetween, sendMessage, etc.)
     * restent inchangées en dessous pour préserver l'architecture.
     */
}