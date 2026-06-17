package com.hospital.backend.service;

import com.hospital.backend.entity.*;
import com.hospital.backend.repository.PrescriptionRepository;
import com.hospital.backend.repository.PrescriptionItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * =============================================================================
 * SERVICE DE RAPPEL DE PRISE DE MEDICAMENTS
 * =============================================================================
 *
 * Ce service envoie des notifications aux patients à chaque heure de prise
 * de médicament définie dans les timeSlots de la prescription.
 *
 * - Vérifie toutes les minutes les prescriptions actives
 * - Envoie une notification au patient à l'heure exacte de prise
 * - Évite les doublons grâce à un suivi des notifications envoyées
 *
 * @author Inua Afya Development Team
 * @version 1.0.0
 * =============================================================================
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MedicationReminderService {

    private final PrescriptionRepository prescriptionRepository;
    private final NotificationService notificationService;

    // Set pour éviter les doublons de notifications (patientId_medicationId_heure_date)
    private final Set<String> sentNotifications = ConcurrentHashMap.newKeySet();

    // Formatter pour parser les timeSlots (format: "HH:mm")
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * =========================================================================
     * TACHE PLANIFIEE : Vérification des rappels de médicaments
     * =========================================================================
     *
     * Executee toutes les minutes pour vérifier si un patient doit prendre
     * un médicament à l'heure actuelle.
     *
     * Cron: 0 0/5 * * * * (toutes les 5 minutes)
     * =========================================================================
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void checkMedicationReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalTime currentTime = now.toLocalTime();
        LocalDate today = now.toLocalDate();

        // Récupérer les prescriptions délivrées/payées avec leurs items
        List<Prescription> activePrescriptions = prescriptionRepository
            .findActivePrescriptionsWithTimeSlots();

        for (Prescription prescription : activePrescriptions) {
            try {
                // Vérifier si la prescription est encore valide (en fonction de la durée)
                if (!isPrescriptionStillValid(prescription, today)) {
                    continue;
                }

                Patient patient = prescription.getPatient();
                if (patient == null || patient.getUser() == null) {
                    continue;
                }

                User patientUser = patient.getUser();

                // Parcourir les items de la prescription
                for (PrescriptionItem item : prescription.getItems()) {
                    if (item.getTimeSlots() == null || item.getTimeSlots().isEmpty()) {
                        continue;
                    }

                    Medication medication = item.getMedication();
                    String medicationName = medication != null ? medication.getName() : "Médicament";

                    // Vérifier chaque timeSlot
                    for (String timeSlot : item.getTimeSlots()) {
                        try {
                            LocalTime slotTime = LocalTime.parse(timeSlot, TIME_FORMATTER);

                            // Vérifier si c'est l'heure de la prise (dans la minute actuelle)
                            if (isTimeToRemind(currentTime, slotTime)) {
                                String notificationKey = buildNotificationKey(
                                    patientUser.getId(),
                                    item.getId(),
                                    timeSlot,
                                    today
                                );

                                // Éviter les doublons
                                if (!sentNotifications.contains(notificationKey)) {
                                    // 🔢 Calculer les prises restantes
                                    Integer remainingDoses = calculateRemainingDoses(item, prescription);
                                    
                                    // 🛑 Ne pas notifier si tout est terminé
                                    if (remainingDoses != null && remainingDoses <= 0) {
                                        log.info("💊 Traitement terminé pour {} - {} prises restantes",
                                            patient.getFirstName(), medicationName);
                                        continue;
                                    }
                                    
                                    sendMedicationReminder(
                                        patientUser,
                                        medicationName,
                                        timeSlot,
                                        item.getQuantityPerDose(),
                                        item.getDosage(),
                                        prescription.getId(),
                                        remainingDoses
                                    );
                                    sentNotifications.add(notificationKey);
                                    log.info("💊 Rappel envoyé à {} pour {} à {} (reste: {} prises)",
                                        patient.getFirstName() + " " + patient.getLastName(),
                                        medicationName,
                                        timeSlot,
                                        remainingDoses);
                                }
                            }
                        } catch (Exception e) {
                            log.warn("⚠️ Format d'heure invalide: {}", timeSlot);
                        }
                    }
                }
            } catch (Exception e) {
                log.error("❌ Erreur lors du traitement de la prescription {}: {}",
                    prescription.getId(), e.getMessage());
            }
        }

        // Nettoyer les anciennes entrées du set (plus de 24h)
        cleanupOldNotifications();
    }

    /**
     * =========================================================================
     * CALCULER LES PRISES RESTANTES
     * =========================================================================
     *
     * Estime le nombre de prises restantes basé sur:
     * - Quantité totale prescrite (quantity)
     * - Quantité par prise (quantityPerDose)
     * - Nombre de timeSlots par jour
     * - Date de début du traitement
     */
    private Integer calculateRemainingDoses(PrescriptionItem item, Prescription prescription) {
        try {
            // Si pas de quantité définie, retourner null (inconnu)
            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                return null;
            }
            
            // Calculer le nombre total de prises possibles
            Integer totalDoses = item.getQuantity() / (item.getQuantityPerDose() != null && item.getQuantityPerDose() > 0 
                ? item.getQuantityPerDose() 
                : 1);
            
            // Estimer les prises déjà effectuées
            LocalDateTime startDate = prescription.getDispensedAt() != null 
                ? prescription.getDispensedAt() 
                : prescription.getCreatedAt();
            
            if (startDate == null) {
                return totalDoses;
            }
            
            // Nombre de prises par jour
            int dosesPerDay = item.getTimeSlots() != null ? item.getTimeSlots().size() : 1;
            
            // Jours écoulés depuis le début
            long daysElapsed = ChronoUnit.DAYS.between(startDate.toLocalDate(), LocalDate.now());
            
            // Prises estimées déjà faites
            long dosesTaken = daysElapsed * dosesPerDay;
            
            // Si on est dans la première journée et l'heure actuelle est avant le premier timeSlot,
            // aucune prise n'a encore été faite aujourd'hui
            if (daysElapsed == 0 && item.getTimeSlots() != null && !item.getTimeSlots().isEmpty()) {
                LocalTime now = LocalTime.now();
                LocalTime firstSlot = LocalTime.parse(item.getTimeSlots().get(0), TIME_FORMATTER);
                if (now.isBefore(firstSlot)) {
                    dosesTaken = 0;
                }
            }
            
            // Prises restantes
            int remaining = (int) Math.max(0, totalDoses - dosesTaken);
            return remaining;
            
        } catch (Exception e) {
            log.warn("⚠️ Erreur calcul prises restantes: {}", e.getMessage());
            return null;
        }
    }

    /**
     * =========================================================================
     * VÉRIFIER SI C'EST L'HEURE DE RAPPELER
     * =========================================================================
     *
     * Compare l'heure actuelle avec l'heure du timeSlot (tolérance de 1 minute)
     */
    private boolean isTimeToRemind(LocalTime currentTime, LocalTime slotTime) {
        long minutesDiff = Math.abs(ChronoUnit.MINUTES.between(currentTime, slotTime));
        return minutesDiff < 1; // Tolérance d'1 minute
    }

    /**
     * =========================================================================
     * VÉRIFIER SI LA PRESCRIPTION EST ENCORE VALIDE
     * =========================================================================
     *
     * Une prescription est valide si la date actuelle est dans la durée
     * de traitement à partir de la date de délivrance.
     */
    private boolean isPrescriptionStillValid(Prescription prescription, LocalDate today) {
        LocalDateTime dispensedAt = prescription.getDispensedAt();
        if (dispensedAt == null) {
            // Si pas de date de délivrance, utiliser la date de création
            dispensedAt = prescription.getCreatedAt();
        }

        if (dispensedAt == null) {
            return false;
        }

        // Calculer la date de fin de traitement
        // Par défaut 7 jours si pas de durée spécifiée sur les items
        int maxDuration = prescription.getItems().stream()
            .filter(item -> item.getDuration() != null && item.getDuration() > 0)
            .mapToInt(PrescriptionItem::getDuration)
            .max()
            .orElse(7); // Par défaut 7 jours

        LocalDate endDate = dispensedAt.toLocalDate().plusDays(maxDuration);
        return !today.isAfter(endDate);
    }

    /**
     * =========================================================================
     * ENVOYER LA NOTIFICATION DE RAPPEL
     * =========================================================================
     * 
     * 🔒 CONFIDENTIALITÉ : Le nom du médicament n'est pas révélé dans le message
     * pour des raisons de confidentialité médicale. Le patient doit ouvrir
     * l'application pour voir les détails de sa prescription.
     */
    private void sendMedicationReminder(User patientUser, String medicationName,
                                        String timeSlot, Integer quantityPerDose,
                                        String dosage, Long prescriptionId,
                                        Integer remainingDoses) {
        String doseText = quantityPerDose != null && quantityPerDose > 0
            ? quantityPerDose + " comprimé(s)"
            : "la dose prescrite";

        // 🎯 Message générique sans nom de médicament (confidentialité)
        String title = "💊 Rappel de prise de médicament";
        
        // Calculer les prises restantes
        String remainingText = "";
        if (remainingDoses != null && remainingDoses > 0) {
            if (remainingDoses == 1) {
                remainingText = " - Dernière prise";
            } else if (remainingDoses <= 3) {
                remainingText = String.format(" - Il vous en reste %d prise(s)", remainingDoses);
            }
        }

        String message = String.format(
            "Il est %s - Prenez %s de votre médicament%s (%s). Ouvrez l'application pour voir les détails.",
            timeSlot,
            doseText,
            remainingText,
            dosage != null ? dosage : "selon prescription"
        );

        notificationService.createAndSend(
            patientUser,
            title,
            message,
            NotificationType.PRISE_MEDICAMENT,
            prescriptionId
        );
    }

    /**
     * =========================================================================
     * CONSTRUIRE LA CLÉ DE NOTIFICATION (pour éviter les doublons)
     * =========================================================================
     */
    private String buildNotificationKey(Long userId, Long itemId, String timeSlot, LocalDate date) {
        return String.format("%d_%d_%s_%s", userId, itemId, timeSlot, date.toString());
    }

    /**
     * =========================================================================
     * NETTOYER LES ANCIENNES NOTIFICATIONS ENVOYÉES
     * =========================================================================
     *
     * Supprime les entrées de plus de 24h pour éviter la fuite de mémoire.
     * Cette méthode est appelée périodiquement.
     */
    private void cleanupOldNotifications() {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        String todayStr = today.toString();
        String yesterdayStr = yesterday.toString();

        sentNotifications.removeIf(key -> !key.endsWith(todayStr) && !key.endsWith(yesterdayStr));
    }
}
