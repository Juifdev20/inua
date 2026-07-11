package com.hospital.backend.config;

import com.hospital.backend.entity.IdempotencyRecord;
import com.hospital.backend.repository.IdempotencyRecordRepository;
import com.hospital.backend.security.HospitalTenantContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Idempotence des écritures rejouées après une coupure réseau (mode hors-ligne).
 * Si une requête POST/PUT/PATCH porte un header "Idempotency-Key" déjà vu pour ce
 * tenant, on NE ré-exécute PAS le handler (on renvoie une réponse "déjà traité").
 * → évite le double-apply (ex: double paiement) lors du rejeu d'une écriture qui
 *   avait en réalité réussi au premier essai.
 *
 * Non-cassant : sans header, comportement strictement identique à aujourd'hui.
 * Enregistré uniquement sur une liste blanche de chemins (voir WebConfig).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class IdempotencyInterceptor implements HandlerInterceptor {

    private final IdempotencyRecordRepository repository;
    private static final String ATTR = "idempotencyKeyToPersist";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String key = request.getHeader("Idempotency-Key");
        String method = request.getMethod();
        boolean mutating = "POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method);
        if (key == null || key.isBlank() || !mutating) {
            return true; // rien à faire
        }

        Long tenantId = HospitalTenantContext.getHospitalId();
        try {
            if (repository.existsByTenantIdAndIdempotencyKey(tenantId, key)) {
                // Déjà traité : on court-circuite sans ré-exécuter le handler
                response.setStatus(HttpServletResponse.SC_OK);
                response.setContentType("application/json");
                response.getWriter().write("{\"success\":true,\"idempotent\":true,\"message\":\"Déjà synchronisé\"}");
                log.info("♻️ [IDEMPOTENCY] Rejeu ignoré (déjà traité) key={} tenant={}", key, tenantId);
                return false;
            }
        } catch (Exception e) {
            // En cas de souci de lecture, on laisse passer (comportement normal)
            log.warn("[IDEMPOTENCY] Lecture échouée, on continue: {}", e.getMessage());
            return true;
        }

        // Première fois : on mémorise pour persister après succès
        request.setAttribute(ATTR, key);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        String key = (String) request.getAttribute(ATTR);
        if (key == null || ex != null) return;
        int status = response.getStatus();
        if (status < 200 || status >= 300) return; // on ne mémorise que les succès

        try {
            repository.save(IdempotencyRecord.builder()
                    .idempotencyKey(key)
                    .tenantId(HospitalTenantContext.getHospitalId())
                    .endpoint(request.getMethod() + " " + request.getRequestURI())
                    .responseStatus(status)
                    .build());
        } catch (Exception e) {
            // Course concurrente (contrainte unique) ou autre : sans gravité
            log.debug("[IDEMPOTENCY] Persistance ignorée pour key={}: {}", key, e.getMessage());
        }
    }
}
