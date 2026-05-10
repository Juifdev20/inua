package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.dto.AuthResponse;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.security.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * ★ CONTRÔLEUR POUR FINALISER LA CONFIGURATION OAUTH2
 * Permet aux utilisateurs venant de Google/Facebook de définir leur mot de passe
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "OAuth2 Setup", description = "Finalisation du compte après connexion sociale")
public class OAuth2SetupController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * ★ FINALISER LA CONFIGURATION DU COMPTE OAUTH2
     * Définit un mot de passe pour un utilisateur créé via Google/Facebook
     */
    @PostMapping("/complete-oauth-setup")
    @Operation(summary = "Finaliser la configuration du compte OAuth2",
            description = "Définit un mot de passe pour un utilisateur créé via Google ou Facebook")
    public ResponseEntity<?> completeOAuthSetup(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> passwordData) {

        try {
            // Extraire le token du header Authorization
            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
            if (token == null || token.isEmpty()) {
                return ResponseEntity.status(401).body(ApiResponse.error("Token de session requis"));
            }

            // Valider le token et extraire le username
            String username;
            try {
                username = jwtTokenProvider.getUsernameFromToken(token);
            } catch (Exception e) {
                log.error("❌ [OAuth2 Setup] Token invalide: {}", e.getMessage());
                return ResponseEntity.status(401).body(ApiResponse.error("Session invalide ou expirée"));
            }
            User user = userRepository.findByUsername(username).orElse(null);

            if (user == null) {
                return ResponseEntity.status(404).body(ApiResponse.error("Utilisateur non trouvé"));
            }

            // Vérifier que c'est bien un utilisateur OAuth2
            if (user.getOauthProvider() == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Ce compte n'est pas un compte OAuth2"));
            }

            String password = passwordData.get("password");
            String confirmPassword = passwordData.get("confirmPassword");

            // Validations
            if (password == null || password.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Mot de passe requis"));
            }

            if (password.length() < 6) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Le mot de passe doit faire au moins 6 caractères"));
            }

            if (!password.equals(confirmPassword)) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Les mots de passe ne correspondent pas"));
            }

            // Vérifier la complexité
            int typeCount = 0;
            if (password.matches(".*[A-Z].*")) typeCount++;
            if (password.matches(".*[a-z].*")) typeCount++;
            if (password.matches(".*[0-9].*")) typeCount++;

            if (typeCount < 2) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Le mot de passe doit contenir au moins 2 types de caractères (majuscules, minuscules, chiffres)"));
            }

            // Mettre à jour le mot de passe
            user.setPassword(passwordEncoder.encode(password));
            user.setMustChangePassword(false);
            userRepository.save(user);

            log.info("✅ [OAuth2 Setup] Compte finalisé pour: {}", username);

            // Générer les tokens JWT pour connexion automatique
            String accessToken = jwtTokenProvider.generateAccessToken(user);
            String refreshToken = jwtTokenProvider.generateRefreshToken(user.getUsername());

            // Construire la réponse
            AuthResponse authResponse = AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .tokenType("Bearer")
                    .user(mapToUserDTO(user))
                    .build();

            return ResponseEntity.ok(ApiResponse.success(
                    "Compte configuré avec succès",
                    authResponse
            ));

        } catch (Exception e) {
            log.error("❌ [OAuth2 Setup] Erreur: {}", e.getMessage());
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Erreur lors de la configuration du compte"));
        }
    }

    /**
     * Vérifie le statut d'un token de setup OAuth2
     */
    @GetMapping("/oauth-setup-status")
    @Operation(summary = "Vérifier le statut du token de setup OAuth2")
    public ResponseEntity<?> checkSetupStatus(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Non authentifié"));
        }

        String username = authentication.getName();
        User user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Utilisateur non trouvé"));
        }

        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "email", user.getEmail(),
                "firstName", user.getFirstName(),
                "lastName", user.getLastName(),
                "oauthProvider", user.getOauthProvider(),
                "hasPassword", user.getPassword() != null && !user.getPassword().isEmpty(),
                "mustChangePassword", Boolean.TRUE.equals(user.getMustChangePassword())
        )));
    }

    private com.hospital.backend.dto.UserDTO mapToUserDTO(User user) {
        return com.hospital.backend.dto.UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole() != null ? user.getRole().getNom() : "ROLE_USER")
                .isActive(user.getIsActive())
                .mustChangePassword(user.getMustChangePassword())
                .oauthProvider(user.getOauthProvider())
                .build();
    }
}
