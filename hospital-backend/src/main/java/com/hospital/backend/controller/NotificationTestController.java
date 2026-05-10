package com.hospital.backend.controller;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.Map;
import java.time.LocalDateTime;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = {"https://inua-oux2.onrender.com", "https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class NotificationTestController {

    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping("/api/test-notify")
    @PreAuthorize("hasRole('ADMIN')")
    public String sendTest(@RequestParam String message) {
        // Envoie le message au canal auquel le Sidebar est abonné
        messagingTemplate.convertAndSend("/topic/notifications", Map.of(
            "content", message,
            "timestamp", LocalDateTime.now().toString()
        ));
        return "Notification envoyée : " + message;
    }

    /**
     * ✅ NOUVEAU: Permet à l'admin de créer une notification broadcast
     * Cette notification apparaîtra en temps réel sur tous les clients connectés
     */
    @PostMapping("/api/admin/broadcast-notification")
    @PreAuthorize("hasRole('ADMIN')")
    public String broadcastNotification(@RequestBody Map<String, String> payload) {
        String title = payload.getOrDefault("title", "Nouvelle notification");
        String message = payload.getOrDefault("message", "Message de l'administrateur");
        String type = payload.getOrDefault("type", "INFO");

        // Envoie au topic général pour tous les utilisateurs connectés
        messagingTemplate.convertAndSend("/topic/notifications", Map.of(
            "id", System.currentTimeMillis(),
            "content", message,
            "title", title,
            "type", type,
            "timestamp", LocalDateTime.now().toString(),
            "broadcast", true
        ));

        return "Notification broadcast envoyée à tous les utilisateurs connectés";
    }
}