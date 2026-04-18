package com.hospital.backend.service;

import com.hospital.backend.entity.Notification;
import com.hospital.backend.entity.NotificationType;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
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
        
        log.info("📢 Notification envoyée à l'utilisateur {}: {} - {}", recipient.getId(), title, message);
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

    // ========================================
    // ✅ NOUVEAU: Notifications pour le Workflow
    // ========================================

    /**
     * Notifie la Finance qu'un paiement est reçu (provenant de Reception, Labo, Pharmacie)
     * @param invoiceId ID de la facture payée
     * @param amount Montant payé
     * @param patientName Nom du patient
     * @param departmentSource Département source (RECEPTION, DOCTOR, LABO, PHARMACY)
     */
    @Transactional
    public void notifyPaymentReceived(Long invoiceId, BigDecimal amount, String patientName, String departmentSource) {
        log.info("💰 Notification: Paiement de {} CDF reçu pour patient {} - Source: {}", 
                amount, patientName, departmentSource);
        
        // Note: Pour l'instant, on log simplement. 
        // Dans une implémentation complète, on.enverrait aux utilisateurs du rôle FINANCE
    }

    /**
     * Notifie le Laboratoire qu'un patient peut être reçu (paiement validé)
     * @param patientName Nom du patient
     * @param consultationId ID de la consultation
     * @param examDetails Détails des examens
     */
    @Transactional
    public void notifyLabToProceed(String patientName, Long consultationId, String examDetails) {
        log.info("🧪 Notification Labo: Patient {} - Examens: {}", patientName, examDetails);
        
        // Log pour le moment. Dans une version complète:
        // - Envoyer notification aux utilisateurs du rôle LABORATOIN
        // - Ou via WebSocket vers le topic /topic/lab
    }

    /**
     * Notifie la Pharmacie qu'un patient peut retirer ses médicaments (paiement validé)
     * @param patientName Nom du patient
     * @param prescriptionId ID de la prescription
     */
    @Transactional
    public void notifyPharmacyToDeliver(String patientName, Long prescriptionId) {
        log.info("💊 Notification Pharmacie: Patient {} peut retirer ses médicaments - Prescription: {}", 
                patientName, prescriptionId);
        
        // Log pour le moment. Dans une version complète:
        // - Envoyer notification aux utilisateurs du rôle PHARMACIE
    }

    /**
     * Notifie le Docteur qu'un patient est prêt pour la consultation (après paiement)
     * @param patientName Nom du patient
     * @param consultationId ID de la consultation
     */
    @Transactional
    public void notifyDoctorPatientReady(String patientName, Long consultationId) {
        log.info("👨‍⚕️ Notification Médecin: Patient {} prêt pour consultation {}", 
                patientName, consultationId);
    }

    // ========================================
    // ✅ Notifications pour le Flux Pharmacie-Finance
    // ========================================

    /**
     * Notifie les caissiers qu'une nouvelle dépense est en attente de validation
     * Déclenché automatiquement lors de la réception d'une commande fournisseur
     * @param transaction La transaction créée
     */
    @Transactional
    public void notifierNouvelleDepense(com.hospital.backend.entity.FinanceTransaction transaction) {
        log.info("📢 Notification Finance: Nouvelle dépense en attente - Transaction ID: {}, Montant: {} {}",
                transaction.getId(), transaction.getMontant(), transaction.getDevise());

        // Envoyer via WebSocket au topic général Finance
        String destination = "/topic/finance/depenses-en-attente";
        messagingTemplate.convertAndSend(destination, Map.of(
            "transactionId", transaction.getId(),
            "montant", transaction.getMontant(),
            "devise", transaction.getDevise(),
            "fournisseur", transaction.getFournisseurNom(),
            "reference", transaction.getReferenceFournisseur(),
            "message", "Nouvelle dépense à valider"
        ));
    }
}
