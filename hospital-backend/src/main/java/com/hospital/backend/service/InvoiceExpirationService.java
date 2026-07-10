package com.hospital.backend.service;

import com.hospital.backend.entity.*;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * =============================================================================
 * SERVICE D'EXPIRATION DES FACTURES ET COMMANDES
 * =============================================================================
 *
 * Ce service gère l'expiration automatique des factures et commandes pharmacie
 * qui n'ont pas été payées dans les 4 heures suivant leur création.
 *
 * - Annule les commandes PENDING après 4 heures
 * - Libère le stock de médicaments réservés
 * - Notifie le patient de l'expiration
 *
 * @author Inua Afya Development Team
 * @version 1.0.0
 * =============================================================================
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceExpirationService {

    private final PharmacyOrderRepository pharmacyOrderRepository;
    private final PharmacyOrderItemRepository pharmacyOrderItemRepository;
    private final MedicationRepository medicationRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final SchedulerLockService lockService;

    /**
     * =========================================================================
     * TACHE PLANIFIEE : Expiration automatique des commandes pharmacie
     * =========================================================================
     *
     * Executee toutes les 15 minutes pour annuler les commandes non payees
     * qui ont dépasse 4 heures depuis leur creation.
     *
     * Cron: 0 &#42;/15 * * * * (toutes les 15 minutes)
     * =========================================================================
     */
    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void expirePendingPharmacyOrders() {
        // 🔒 Multi-instance : une seule instance exécute (évite double annulation/notif)
        if (!lockService.tryAcquire("invoice-expiration", 600)) return;
        log.info("🕐 [EXPIRATION] Vérification des commandes pharmacie expirées...");
        
        LocalDateTime expirationThreshold = LocalDateTime.now().minusHours(4);
        
        // Récupérer les commandes en attente de paiement créées il y a plus de 4h
        List<PharmacyOrder> expiredOrders = pharmacyOrderRepository
            .findByStatusAndCreatedAtBefore(PharmacyOrderStatus.EN_ATTENTE_PAIEMENT, expirationThreshold);
        
        int expiredCount = 0;
        
        for (PharmacyOrder order : expiredOrders) {
            try {
                // Restituer le stock pour chaque médicament
                restoreStockForOrder(order);
                
                // Marquer la commande comme annulée/expirée
                order.setStatus(PharmacyOrderStatus.ANNULEE);
                order.setNotes((order.getNotes() != null ? order.getNotes() + "\n" : "") + 
                    "[AUTO] Expirée après 4h sans paiement le " + LocalDateTime.now());
                pharmacyOrderRepository.save(order);
                
                // Notifier le patient
                if (order.getPatient() != null && order.getPatient().getUser() != null) {
                    Long userId = order.getPatient().getUser().getId();
                    userRepository.findById(userId).ifPresent(user -> {
                        notificationService.createAndSend(
                            user,
                            "Commande expirée",
                            "Votre commande pharmacie " + order.getOrderCode() + " a expiré. " +
                            "Les médicaments ont été remis en stock. Veuillez passer une nouvelle commande.",
                            NotificationType.SYSTEME
                        );
                    });
                }
                
                expiredCount++;
                log.info("✅ [EXPIRATION] Commande #{} expirée et stock restauré", order.getOrderCode());
                
            } catch (Exception e) {
                log.error("❌ [EXPIRATION] Erreur lors de l'expiration de la commande #{}: {}", 
                    order.getOrderCode(), e.getMessage());
            }
        }
        
        if (expiredCount > 0) {
            log.info("🎉 [EXPIRATION] {} commandes expirées et stock restauré", expiredCount);
        }
    }

    /**
     * =========================================================================
     * RESTITUER LE STOCK POUR UNE COMMANDE
     * =========================================================================
     *
     * Remet en stock les medicaments reserves pour une commande annulee/expiree.
     *
     * @param order La commande pharmacie dont le stock doit etre restaure
     * =========================================================================
     */
    private void restoreStockForOrder(PharmacyOrder order) {
        List<PharmacyOrderItem> items = pharmacyOrderItemRepository.findByPharmacyOrderId(order.getId());
        
        for (PharmacyOrderItem item : items) {
            if (item.getMedication() != null) {
                Medication medication = item.getMedication();
                // Remettre la quantité en stock
                int currentStock = medication.getStockQuantity();
                medication.setStockQuantity(currentStock + item.getQuantity());
                medicationRepository.save(medication);
                
                log.info("📦 [STOCK] Restauration de {} unités de {} (Stock: {} -> {})",
                    item.getQuantity(),
                    medication.getName(),
                    currentStock,
                    currentStock + item.getQuantity()
                );
            }
        }
    }

    /**
     * =========================================================================
     * VERIFICATION MANUELLE D'EXPIRATION
     * =========================================================================
     *
     * Permet de verifier manuellement si une commande specifique a expire.
     *
     * @param order La commande a verifier
     * @return true si la commande a expire (plus de 4h et non payee)
     * =========================================================================
     */
    public boolean isOrderExpired(PharmacyOrder order) {
        if (order.getStatus() != PharmacyOrderStatus.EN_ATTENTE_PAIEMENT) {
            return false;
        }
        
        LocalDateTime expirationTime = order.getCreatedAt().plusHours(4);
        return LocalDateTime.now().isAfter(expirationTime);
    }

    /**
     * =========================================================================
     * OBTENIR LE TEMPS RESTANT AVANT EXPIRATION
     * =========================================================================
     *
     * @param order La commande a verifier
     * @return Minutes restantes avant expiration (0 si déjà expiree)
     * =========================================================================
     */
    public long getMinutesUntilExpiration(PharmacyOrder order) {
        if (order.getStatus() != PharmacyOrderStatus.EN_ATTENTE_PAIEMENT) {
            return 0;
        }
        
        LocalDateTime expirationTime = order.getCreatedAt().plusHours(4);
        LocalDateTime now = LocalDateTime.now();
        
        if (now.isAfter(expirationTime)) {
            return 0;
        }
        
        return java.time.Duration.between(now, expirationTime).toMinutes();
    }
}
