package com.hospital.backend.service;

import com.hospital.backend.entity.Notification;
import com.hospital.backend.entity.NotificationType;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Version simplifiée (Rétrocompatibilité)
     */
    @Transactional
    public void createAndSend(User recipient, String title, String message, NotificationType type) {
        createAndSend(recipient, title, message, type, null);
    }

    /**
     * Crée une notification avec un ID de référence pour la redirection (Style Facebook)
     * @param recipient L'utilisateur qui reçoit la notification
     * @param title Titre de l'alerte
     * @param message Contenu du message
     * @param type Type (RENDEZ_VOUS, DOCUMENT, etc.)
     * @param referenceId ID de la ressource concernée (ex: consultationId)
     */
    @Transactional
    public void createAndSend(User recipient, String title, String message, NotificationType type, Long referenceId) {
        // 1. Sauvegarde en base de données avec le referenceId
        Notification notification = Notification.builder()
                .user(recipient)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId) // Stocke l'ID pour la redirection React
                .isRead(false)
                .build();

        Notification savedNotification = notificationRepository.save(notification);

        // 2. Envoi en temps réel via WebSocket
        String destination = "/topic/notifications/" + recipient.getId();
        messagingTemplate.convertAndSend(destination, savedNotification);
    }

    /**
     * Marque toutes les notifications d'un utilisateur comme lues.
     */
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    /**
     * Récupère l'historique complet pour un utilisateur.
     */
    public List<Notification> getNotificationsForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Compte les notifications non lues.
     */
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }
}