package com.hospital.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Planificateur des abonnements : transitions de statut (essai/grâce/expiration)
 * et envoi des alertes de renouvellement (J-N avant échéance).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionScheduler {

    private final SubscriptionService subscriptionService;
    private final SchedulerLockService lockService;

    /** Tous les jours à 08:00. Également au démarrage (après 1 min) pour rattraper l'état. */
    @Scheduled(cron = "0 0 8 * * *")
    public void dailyMaintenance() {
        run("planifié 08:00");
    }

    @Scheduled(initialDelay = 60_000, fixedDelay = Long.MAX_VALUE)
    public void onStartup() {
        run("démarrage");
    }

    private void run(String trigger) {
        // 🔒 Multi-instance : une seule instance exécute la maintenance (évite alertes/emails en double)
        if (!lockService.tryAcquire("subscription-maintenance", 3600)) return;
        try {
            log.info("🗓️ [SUBSCRIPTION] Maintenance des abonnements ({})", trigger);
            subscriptionService.runSubscriptionMaintenance();
        } catch (Exception e) {
            log.error("[SUBSCRIPTION] Maintenance échouée: {}", e.getMessage());
        }
    }
}
