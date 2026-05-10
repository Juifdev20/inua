package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.UserRepository;
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
 * ★ CONTRÔLEUR POUR LE CHANGEMENT DE MOT DE PASSE
 * Gère le changement forcé au premier login et le changement normal
 */
@RestController
@RequestMapping("/api/password")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Password Management", description = "Gestion des mots de passe utilisateurs")
public class PasswordChangeController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * ★ VÉRIFICATION DU STATUT mustChangePassword
     * Appelé après le login pour savoir si l'utilisateur doit changer son mot de passe
     */
    @GetMapping("/must-change-status")
    @Operation(summary = "Vérifier si l'utilisateur doit changer son mot de passe")
    public ResponseEntity<?> getMustChangeStatus(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Non authentifié"));
        }

        String username = authentication.getName();
        User user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Utilisateur non trouvé"));
        }

        boolean mustChange = user.getMustChangePassword() != null && user.getMustChangePassword();

        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "mustChangePassword", mustChange,
                "username", username,
                "firstName", user.getFirstName()
        )));
    }

    /**
     * ★ CHANGEMENT DE MOT DE PASSE FORCÉ (premier login)
     * Endpoint accessible même avec un token "faible" - après changement, token valide
     */
    @PostMapping("/force-change")
    @Operation(summary = "Changement de mot de passe obligatoire (premier login)")
    public ResponseEntity<?> forcePasswordChange(
            @RequestBody Map<String, String> passwordData,
            Authentication authentication) {

        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(ApiResponse.error("Non authentifié"));
            }

            String username = authentication.getName();
            User user = userRepository.findByUsername(username).orElse(null);

            if (user == null) {
                return ResponseEntity.status(404).body(ApiResponse.error("Utilisateur non trouvé"));
            }

            // Vérifier que le changement est bien requis
            if (user.getMustChangePassword() == null || !user.getMustChangePassword()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Changement de mot de passe non requis"));
            }

            String newPassword = passwordData.get("newPassword");
            String confirmPassword = passwordData.get("confirmPassword");

            // Validations
            if (newPassword == null || newPassword.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Nouveau mot de passe requis"));
            }

            if (newPassword.length() < 6) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Le mot de passe doit faire au moins 6 caractères"));
            }

            if (!newPassword.equals(confirmPassword)) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Les mots de passe ne correspondent pas"));
            }

            // Vérifier que le nouveau mot de passe est différent de l'ancien (par défaut)
            if (newPassword.equals("Inua@2026")) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Vous devez choisir un mot de passe différent du mot de passe par défaut"));
            }

            // Mettre à jour le mot de passe
            user.setPassword(passwordEncoder.encode(newPassword));
            user.setMustChangePassword(false); // Réinitialiser le flag
            userRepository.save(user);

            log.info("✅ Mot de passe changé avec succès pour: {}", username);

            return ResponseEntity.ok(ApiResponse.success(
                    "Mot de passe changé avec succès",
                    Map.of(
                            "username", username,
                            "mustChangePassword", false
                    )
            ));

        } catch (Exception e) {
            log.error("❌ Erreur changement mot de passe forcé: {}", e.getMessage());
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Erreur lors du changement de mot de passe"));
        }
    }

    /**
     * ★ CHANGEMENT DE MOT DE PASSE VOLONTAIRE (utilisateur connecté)
     * Nécessite l'ancien mot de passe pour validation
     */
    @PostMapping("/change")
    @Operation(summary = "Changement de mot de passe volontaire (avec ancien mot de passe)")
    public ResponseEntity<?> changePassword(
            @RequestBody Map<String, String> passwordData,
            Authentication authentication) {

        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(ApiResponse.error("Non authentifié"));
            }

            String username = authentication.getName();
            User user = userRepository.findByUsername(username).orElse(null);

            if (user == null) {
                return ResponseEntity.status(404).body(ApiResponse.error("Utilisateur non trouvé"));
            }

            String oldPassword = passwordData.get("oldPassword");
            String newPassword = passwordData.get("newPassword");
            String confirmPassword = passwordData.get("confirmPassword");

            // Vérifier ancien mot de passe
            if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Ancien mot de passe incorrect"));
            }

            // Validations
            if (newPassword == null || newPassword.length() < 6) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Le nouveau mot de passe doit faire au moins 6 caractères"));
            }

            if (!newPassword.equals(confirmPassword)) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Les mots de passe ne correspondent pas"));
            }

            // Mettre à jour
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);

            log.info("✅ Mot de passe changé volontairement par: {}", username);

            return ResponseEntity.ok(ApiResponse.success("Mot de passe changé avec succès"));

        } catch (Exception e) {
            log.error("❌ Erreur changement mot de passe: {}", e.getMessage());
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Erreur lors du changement de mot de passe"));
        }
    }
}
