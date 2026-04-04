package com.hospital.backend.controller;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import lombok.RequiredArgsConstructor;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class NotificationTestController {

    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping("/api/test-notify")
    public String sendTest(@RequestParam String message) {
        // Envoie le message au canal auquel le Sidebar est abonné
        messagingTemplate.convertAndSend("/topic/notifications", Map.of("content", message));
        return "Notification envoyée : " + message;
    }
}