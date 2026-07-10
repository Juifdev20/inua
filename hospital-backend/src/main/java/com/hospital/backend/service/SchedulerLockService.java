package com.hospital.backend.service;

import com.hospital.backend.repository.SchedulerLockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Verrou distribué léger pour les jobs @Scheduled (multi-instance), sans dépendance externe.
 * Usage : if (!lockService.tryAcquire("mon-job", 600)) return;  // 600s = durée du verrou
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SchedulerLockService {

    private final SchedulerLockRepository repository;

    /** Identifiant unique de CETTE instance (JVM) pour la traçabilité. */
    private static final String INSTANCE_ID = UUID.randomUUID().toString().substring(0, 8);

    /**
     * Tente d'acquérir le verrou. Vrai si cette instance peut exécuter le job.
     * REQUIRES_NEW : le verrou est validé immédiatement, indépendamment du job.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean tryAcquire(String lockName, long lockSeconds) {
        try {
            LocalDateTime now = LocalDateTime.now();
            int rows = repository.tryAcquire(lockName, now.plusSeconds(lockSeconds), INSTANCE_ID, now);
            if (rows > 0) {
                log.debug("🔒 [SCHEDULER] Verrou '{}' acquis par instance {}", lockName, INSTANCE_ID);
                return true;
            }
            log.debug("⏭️ [SCHEDULER] Verrou '{}' détenu par une autre instance — job ignoré ici", lockName);
            return false;
        } catch (Exception e) {
            // 1er démarrage (table pas encore créée) ou souci transitoire : on autorise
            // l'exécution pour ne pas bloquer le job en mono-instance.
            log.warn("⚠️ [SCHEDULER] Verrou '{}' indisponible, exécution autorisée: {}", lockName, e.getMessage());
            return true;
        }
    }
}
