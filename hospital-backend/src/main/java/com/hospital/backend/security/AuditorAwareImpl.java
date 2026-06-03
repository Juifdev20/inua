package com.hospital.backend.security;

import com.hospital.backend.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 🔍 AuditorAwareImpl - Fournisseur d'auditeur pour JPA Auditing
 *
 * Cette classe permet à Spring Data JPA de remplir automatiquement
 * les champs @CreatedBy et @LastModifiedBy des entités annotées.
 *
 * Elle récupère l'utilisateur connecté depuis le SecurityContextHolder
 * (alimenté par le JwtAuthenticationFilter existant).
 *
 * Stratégie de fallback :
 * 1. Email de l'utilisateur si disponible (plus stable pour l'audit)
 * 2. Username si pas d'email
 * 3. "system" si aucun utilisateur authentifié (batchs, migrations)
 */
@Component("auditorAwareImpl")
@Slf4j
public class AuditorAwareImpl implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // 1. Vérification basique : authentifié et non anonyme
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            log.debug("[AUDIT] Aucun utilisateur authentifié, fallback 'system'");
            return Optional.of("system");
        }

        // 2. Extraction depuis CustomUserDetails (JWT local)
        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails customUserDetails) {
            User user = customUserDetails.getUser();
            String auditor = (user.getEmail() != null && !user.getEmail().isBlank())
                    ? user.getEmail()
                    : user.getUsername();
            log.debug("[AUDIT] Utilisateur authentifié (CustomUserDetails): {}", auditor);
            return Optional.of(auditor);
        }

        // 3. Fallback OAuth2 ou utilisateurs sans CustomUserDetails
        String name = authentication.getName();
        log.debug("[AUDIT] Utilisateur authentifié (principal simple): {}", name);
        return Optional.ofNullable(name).filter(n -> !n.isBlank()).or(() -> Optional.of("system"));
    }
}
