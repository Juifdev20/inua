package com.hospital.backend.service;

import com.hospital.backend.entity.*;
import com.hospital.backend.repository.NotificationRepository;
import com.hospital.backend.repository.PrescribedExamRepository;
import com.hospital.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * ★ SERVICE D'ALERTES LABORATOIRE
 * Génère automatiquement des notifications pour les événements critiques du labo
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LabAlertService {

    private final NotificationRepository notificationRepository;
    private final PrescribedExamRepository prescribedExamRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * ★ Génère des alertes intelligentes basées sur l'état des examens
     */
    @Transactional
    public void generateLabAlerts() {
        log.info("🔔 [LAB ALERT] Génération des alertes laboratoire...");

        List<PrescribedExam> allExams = prescribedExamRepository.findAllActive();

        // 1. Alertes: Examens urgents en attente depuis plus de 2h
        LocalDateTime twoHoursAgo = LocalDateTime.now().minusHours(2);
        List<PrescribedExam> delayedUrgentExams = allExams.stream()
            .filter(e -> e.getResultValue() == null || e.getResultValue().isEmpty())
            .filter(e -> e.getCreatedAt() != null && e.getCreatedAt().isBefore(twoHoursAgo))
            .collect(Collectors.toList());

        for (PrescribedExam exam : delayedUrgentExams) {
            Consultation c = exam.getConsultation();
            String patientName = c != null && c.getPatient() != null ?
                c.getPatient().getFirstName() + " " + c.getPatient().getLastName() : "Patient inconnu";
            
            createAlertIfNotExists(
                "Examen urgent en attente",
                String.format("%s (%s) dépasse le temps standard de prise en charge.",
                    patientName, exam.getServiceName()),
                NotificationType.EXAMEN_A_REALISER,
                c != null ? c.getId() : null,
                "LABORATOIRE"
            );
        }

        // 2. Alertes: Valeurs critiques détectées aujourd'hui
        List<PrescribedExam> criticalExams = allExams.stream()
            .filter(e -> Boolean.TRUE.equals(e.getIsCritical()))
            .filter(e -> e.getResultValue() != null && !e.getResultValue().isEmpty())
            .filter(e -> e.getResultEnteredAt() != null && 
                       e.getResultEnteredAt().toLocalDate().equals(LocalDateTime.now().toLocalDate()))
            .collect(Collectors.toList());

        for (PrescribedExam exam : criticalExams) {
            Consultation c = exam.getConsultation();
            String patientName = c != null && c.getPatient() != null ?
                c.getPatient().getFirstName() + " " + c.getPatient().getLastName() : "Patient inconnu";
            
            createAlertIfNotExists(
                "Valeur critique détectée",
                String.format("%s - %s: %s %s (hors limites normales)",
                    patientName, exam.getServiceName(), exam.getResultValue(), 
                    exam.getUnit() != null ? exam.getUnit() : ""),
                NotificationType.DOCUMENT,
                c != null ? c.getId() : null,
                "LABORATOIRE"
            );
        }

        // 3. Alertes: Résultats prêts pour validation médicale
        List<PrescribedExam> resultsReady = allExams.stream()
            .filter(e -> e.getResultValue() != null && !e.getResultValue().isEmpty())
            .filter(e -> e.getStatus() == PrescribedExamStatus.COMPLETED)
            .collect(Collectors.toList());

        for (PrescribedExam exam : resultsReady) {
            Consultation c = exam.getConsultation();
            
            createAlertIfNotExists(
                "Validation requise",
                String.format("Résultats prêts pour validation médicale (Examen #%d).", exam.getId()),
                NotificationType.DOCUMENT,
                c != null ? c.getId() : null,
                "LABORATOIRE"
            );
        }

        log.info("🔔 [LAB ALERT] Génération terminée");
    }

    /**
     * ★ Crée une alerte si elle n'existe pas déjà pour ce referenceId et ce type
     */
    private void createAlertIfNotExists(String title, String message, NotificationType type,
                                       Long referenceId, String targetRole) {
        try {
            // Vérifier si une alerte similaire existe déjà (non lue)
            boolean exists = notificationRepository.findByReferenceId(referenceId).stream()
                .anyMatch(n -> n.getType() == type && !n.isRead());

            if (exists) {
                return; // Ne pas créer de doublon
            }

            // Récupérer les utilisateurs du rôle cible
            List<User> targetUsers = userRepository.findAll().stream()
                .filter(u -> u.getRole() != null && u.getRole().getNom().equals(targetRole))
                .collect(Collectors.toList());

            // ★ Si aucun utilisateur avec ce rôle, envoyer quand même via WebSocket au topic général
            if (targetUsers.isEmpty()) {
                log.warn("🔔 [LAB ALERT] Aucun utilisateur trouvé pour le rôle {}, envoi au topic général", targetRole);
                sendGeneralNotification(title, message, type, referenceId);
                return;
            }

            // Créer la notification pour chaque utilisateur
            for (User user : targetUsers) {
                Notification notification = Notification.builder()
                    .user(user)
                    .title(title)
                    .message(message)
                    .type(type)
                    .referenceId(referenceId)
                    .isRead(false)
                    .build();

                Notification saved = notificationRepository.save(notification);

                // 🚀 Envoi en temps réel via WebSocket
                sendRealtimeNotification(user.getId(), saved);

                log.info("🔔 [LAB ALERT] Alerte créée pour {}: {}", user.getEmail(), title);
            }
        } catch (Exception e) {
            log.error("❌ [LAB ALERT] Erreur création alerte: {}", e.getMessage());
        }
    }

    /**
     * ★ Envoie une notification au topic général du labo (sans utilisateur spécifique)
     */
    private void sendGeneralNotification(String title, String message, NotificationType type, Long referenceId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("id", System.currentTimeMillis()); // ID temporaire
            payload.put("title", title);
            payload.put("message", message);
            payload.put("type", type.toString());
            payload.put("referenceId", referenceId);
            payload.put("timestamp", LocalDateTime.now().toString());
            payload.put("read", false);

            // Envoi au topic général du labo pour tous les techniciens
            messagingTemplate.convertAndSend("/topic/laboratory/general", payload);

            log.info("🚀 [LAB ALERT] Notification générale envoyée au topic labo: {}", title);
        } catch (Exception e) {
            log.error("❌ [LAB ALERT] Erreur envoi notification générale: {}", e.getMessage());
        }
    }

    /**
     * 🚀 Envoie une notification en temps réel via WebSocket
     */
    private void sendRealtimeNotification(Long userId, Notification notification) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("id", notification.getId());
            payload.put("title", notification.getTitle());
            payload.put("message", notification.getMessage());
            payload.put("type", notification.getType().toString());
            payload.put("referenceId", notification.getReferenceId());
            payload.put("timestamp", notification.getCreatedAt().toString());
            payload.put("read", false);

            // Envoi au topic personnel de l'utilisateur
            String destination = "/topic/laboratory/" + userId;
            messagingTemplate.convertAndSend(destination, payload);
            
            // Envoi aussi au topic général du labo pour tous les techniciens
            messagingTemplate.convertAndSend("/topic/laboratory/general", payload);
            
            log.info("🚀 [LAB ALERT] Notification temps réel envoyée à {} et topic général", userId);
        } catch (Exception e) {
            log.error("❌ [LAB ALERT] Erreur envoi WebSocket: {}", e.getMessage());
        }
    }

    /**
     * ★ Récupère les alertes actives du laboratoire pour un utilisateur
     */
    public List<Map<String, Object>> getLabAlertsForUser(Long userId) {
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        
        return notifications.stream()
            .filter(n -> isLabRelatedType(n.getType()))
            .map(n -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", n.getId());
                map.put("title", n.getTitle());
                map.put("message", n.getMessage());
                map.put("type", mapToAlertType(n.getType()));
                map.put("read", n.isRead());
                map.put("createdAt", n.getCreatedAt().toString());
                map.put("referenceId", n.getReferenceId() != null ? n.getReferenceId() : "");
                return map;
            })
            .collect(Collectors.toList());
    }

    private boolean isLabRelatedType(NotificationType type) {
        return type == NotificationType.EXAMEN_A_REALISER ||
               type == NotificationType.DOCUMENT;
    }

    private String mapToAlertType(NotificationType type) {
        switch (type) {
            case EXAMEN_A_REALISER:
                return "CRITIQUE";
            case DOCUMENT:
                return "INFO";
            default:
                return "INFO";
        }
    }

    // ============================================
    // ★ NOTIFICATIONS EXTERNES - Appelées par d'autres services
    // ============================================

    /**
     * 🏥 Notifie le labo quand un patient arrive à la réception pour des examens
     */
    public void notifyNewPatientForExams(String patientName, String patientCode, List<String> examNames) {
        String exams = String.join(", ", examNames);
        createAlertIfNotExists(
            "Nouveau patient - Examens demandés",
            String.format("%s (%s) arrive pour : %s", patientName, patientCode, exams),
            NotificationType.EXAMEN_A_REALISER,
            null,
            "LABORATOIRE"
        );
    }

    /**
     * 🩺 Notifie le labo quand un médecin prescrit des examens
     */
    public void notifyExamsPrescribed(String doctorName, String patientName, List<String> examNames, Long consultationId) {
        String exams = String.join(", ", examNames);
        createAlertIfNotExists(
            "Nouvelle prescription de " + doctorName,
            String.format("%s prescrit pour %s : %s", doctorName, patientName, exams),
            NotificationType.EXAMEN_A_REALISER,
            consultationId,
            "LABORATOIRE"
        );
    }

    /**
     * 💰 Notifie le labo quand le paiement des examens est confirmé
     */
    public void notifyPaymentConfirmed(String patientName, String patientCode, String amount) {
        createAlertIfNotExists(
            "Paiement confirmé - Prêt pour examens",
            String.format("%s (%s) - Montant: %s FC. Le patient peut passer au labo.", patientName, patientCode, amount),
            NotificationType.EXAMEN_A_REALISER,
            null,
            "LABORATOIRE"
        );
    }

    /**
     * 🚨 Notifie le labo d'un examen urgent
     */
    public void notifyUrgentExam(String doctorName, String patientName, String examName, Long consultationId) {
        createAlertIfNotExists(
            "🚨 EXAMEN URGENT",
            String.format("%s demande en URGENCE : %s pour %s", doctorName, examName, patientName),
            NotificationType.EXAMEN_A_REALISER,
            consultationId,
            "LABORATOIRE"
        );
    }

    /**
     * ✅ Notifie le labo que les résultats ont été validés par le médecin
     */
    public void notifyResultsValidated(String doctorName, String patientName, List<String> examNames) {
        String exams = String.join(", ", examNames);
        createAlertIfNotExists(
            "Résultats validés par " + doctorName,
            String.format("%s a validé les résultats de %s pour %s", doctorName, exams, patientName),
            NotificationType.DOCUMENT,
            null,
            "LABORATOIRE"
        );
    }

    /**
     * 📋 Notifie le labo d'une demande de bilan complet
     */
    public void notifyCompleteWorkup(String doctorName, String patientName, Long consultationId) {
        createAlertIfNotExists(
            "Demande de bilan complet",
            String.format("%s demande un bilan complet pour %s", doctorName, patientName),
            NotificationType.EXAMEN_A_REALISER,
            consultationId,
            "LABORATOIRE"
        );
    }
}
