package com.hospital.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor // Génère le constructeur pour l'injection automatique
public class TestController {

    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping
    public String test() {
        return "Backend hospitalier opérationnel 🚀";
    }

    /**
     * Envoie une notification fictive à un utilisateur spécifique
     * URL : http://localhost:8080/api/test/notify/1
     */
    @GetMapping("/notify/{userId}")
    public String testNotification(@PathVariable Long userId) {
        // 1. Définition du canal (doit correspondre au subscribe dans React)
        String destination = "/topic/notifications/" + userId;

        // 2. Création de l'objet notification (doit correspondre à ton entité ou DTO)
        Map<String, Object> notification = new HashMap<>();
        notification.put("id", System.currentTimeMillis()); // ID temporaire
        notification.put("title", "Nouvelle Alerte ! 🏥");
        notification.put("message", "Votre système de notification en temps réel fonctionne !");
        notification.put("type", "SYSTEME");
        notification.put("createdAt", LocalDateTime.now().toString());
        notification.put("isRead", false);

        // 3. Envoi via le broker STOMP
        messagingTemplate.convertAndSend(destination, notification);

        return "🚀 Notification envoyée avec succès à l'utilisateur ID: " + userId;
    }
}