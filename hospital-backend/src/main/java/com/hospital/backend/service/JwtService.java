package com.hospital.backend.service;

import com.hospital.backend.entity.User;
import com.hospital.backend.security.CustomUserDetails;
import com.hospital.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Date;

/**
 * 🛡️ JwtService - Couche d'abstraction et utilitaires JWT
 *
 * Ce service wrappe le JwtTokenProvider existant pour fournir une API
 * riche et typée aux controllers/services métier (Auditing, RBAC, etc.).
 * Il ne duplique PAS la logique de signature (elle reste dans JwtTokenProvider).
 *
 * @author InuaAfya Security Team
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JwtService {

    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Extrait le nom d'utilisateur (subject) du token.
     */
    public String extractUsername(String token) {
        return jwtTokenProvider.getUsernameFromToken(token);
    }

    /**
     * Extrait l'email stocké dans le claim "email" du token.
     * Utilisé par l'AuditorAware pour tracer qui a créé/modifié une entité.
     */
    public String extractEmail(String token) {
        try {
            return jwtTokenProvider.getEmailFromToken(token);
        } catch (Exception e) {
            log.warn("[JWT] Impossible d'extraire l'email du token : {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extrait l'ID utilisateur du claim "id".
     */
    public Long extractUserId(String token) {
        return jwtTokenProvider.getUserIdFromToken(token);
    }

    /**
     * Extrait le rôle brut du claim "role".
     */
    public String extractRole(String token) {
        return jwtTokenProvider.getRoleFromToken(token);
    }

    /**
     * Retourne la date d'expiration du token.
     * Utile pour le refresh automatique côté client.
     */
    public Date extractExpiration(String token) {
        try {
            return jwtTokenProvider.getExpirationDateFromToken(token);
        } catch (Exception e) {
            log.warn("[JWT] Impossible d'extraire l'expiration : {}", e.getMessage());
            return null;
        }
    }

    /**
     * Vérifie si le token est syntaxiquement valide et non expiré.
     */
    public boolean isTokenValid(String token) {
        return jwtTokenProvider.validateToken(token);
    }

    /**
     * Délégation pure vers JwtTokenProvider pour la génération.
     */
    public String generateAccessToken(User user) {
        return jwtTokenProvider.generateAccessToken(user);
    }

    /**
     * Délégation pure vers JwtTokenProvider pour le refresh token.
     */
    public String generateRefreshToken(User user) {
        return jwtTokenProvider.generateRefreshToken(user);
    }

    /**
     * Retourne l'email de l'utilisateur connecté dans le contexte de sécurité.
     * Si l'utilisateur n'est pas authentifié, retourne "system".
     * C'est la méthode clé pour l'AuditorAware JPA.
     */
    public String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return "system";
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails customUser) {
            User user = customUser.getUser();
            // Retourne l'email si disponible, sinon le username
            return (user.getEmail() != null && !user.getEmail().isBlank())
                    ? user.getEmail()
                    : user.getUsername();
        }

        // Fallback OAuth2 ou cas simples
        return authentication.getName();
    }

    /**
     * Retourne l'ID de l'utilisateur connecté, ou null.
     */
    public Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails customUser) {
            return customUser.getUser().getId();
        }
        return null;
    }

}
