package com.hospital.backend.controller;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.security.JwtTokenProvider;
import com.hospital.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"https://inua-oux2.onrender.com", "https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"}, 
             allowedHeaders = "*", 
             allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentification", description = "API d'authentification et gestion des tokens")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Connexion réussie", response));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDTO>> register(
            @Valid @RequestBody RegisterRequest request) {
        UserDTO user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Compte créé avec succès", user));
    }

    // --- NOUVELLE MÉTHODE AJOUTÉE POUR CORRIGER L'ERREUR UPDATE ---
    @PutMapping("/update/{id}")
    @Operation(summary = "Mettre à jour le profil utilisateur")
    public ResponseEntity<ApiResponse<UserDTO>> updateProfile(
            @PathVariable Long id,
            @RequestBody UserDTO request) {

        UserDTO updatedUser = authService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.success("Profil mis à jour avec succès", updatedUser));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(
            @RequestParam String refreshToken) {
        LoginResponse response = authService.refreshToken(refreshToken);
        return ResponseEntity.ok(ApiResponse.success("Token rafraîchi", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader("Authorization") String token) {
        authService.logout(token);
        return ResponseEntity.ok(ApiResponse.success("Déconnexion réussie", null));
    }

    /**
     * ★ MOT DE PASSE OUBLIÉ - Demande de réinitialisation
     * Génère un token et envoie un email avec le lien de réinitialisation
     * Validation stricte : vérifie que l'email existe dans la base de données
     */
    @PostMapping("/forgot-password")
    @Operation(summary = "Demander une réinitialisation de mot de passe")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");

        // 1. Validation : email requis
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("L'adresse email est requise"));
        }

        // 2. Validation : format email valide
        if (!isValidEmail(email)) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Format d'email invalide"));
        }

        try {
            // 3. Vérification : l'email existe dans la base ?
            boolean emailExists = authService.checkEmailExists(email);
            if (!emailExists) {
                log.warn("⚠️ [AUTH] Tentative reset-password avec email inexistant: {}", email);
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Aucun compte n'est associé à cet email"));
            }

            // 4. Email existe - procéder à la réinitialisation
            authService.initiatePasswordReset(email);
            return ResponseEntity.ok(ApiResponse.success(
                "Un email de réinitialisation a été envoyé à votre adresse", null));

        } catch (Exception e) {
            log.error("❌ [AUTH] Erreur forgot password: {}", e.getMessage());
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Une erreur est survenue lors de l'envoi de l'email"));
        }
    }

    /**
     * ✅ Valide le format d'un email
     */
    private boolean isValidEmail(String email) {
        String emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
        return email != null && email.matches(emailRegex);
    }

    /**
     * ★ RÉINITIALISATION DE MOT DE PASSE - Confirmer le changement
     */
    @PostMapping("/reset-password")
    @Operation(summary = "Réinitialiser le mot de passe avec un token")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");

        if (token == null || token.isEmpty() || newPassword == null || newPassword.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Token et nouveau mot de passe requis"));
        }

        try {
            authService.resetPassword(token, newPassword);
            return ResponseEntity.ok(ApiResponse.success("Mot de passe réinitialisé avec succès", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("❌ [AUTH] Erreur reset password: {}", e.getMessage());
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Une erreur est survenue"));
        }
    }

    /**
     * ★ VÉRIFIER LE STATUT DU CHANGEMENT DE MOT DE PASSE OBLIGATOIRE
     */
    @GetMapping("/password/must-change-status")
    @Operation(summary = "Vérifier si l'utilisateur doit changer son mot de passe")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMustChangeStatus(
            @RequestHeader("Authorization") String authHeader) {
        try {
            // Extraire le token
            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
            
            if (token == null || token.isEmpty()) {
                return ResponseEntity.status(401).body(ApiResponse.error("Token requis"));
            }
            
            // Récupérer l'utilisateur depuis le token
            String username = jwtTokenProvider.getUsernameFromToken(token);
            User user = userRepository.findByUsername(username).orElse(null);
            
            if (user == null) {
                return ResponseEntity.status(404).body(ApiResponse.error("Utilisateur non trouvé"));
            }
            
            boolean mustChange = Boolean.TRUE.equals(user.getMustChangePassword());
            
            return ResponseEntity.ok(ApiResponse.success(Map.of(
                "mustChangePassword", mustChange,
                "hasPassword", user.getPassword() != null && !user.getPassword().isEmpty()
            )));
            
        } catch (Exception e) {
            log.error("❌ [AUTH] Erreur vérification statut mot de passe: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur serveur"));
        }
        }

    // ═════════════════════════════════════════════════════════════════
    // FORCE CHANGE PASSWORD (first login)
    // ════════════════════════════════════════════════════════════════════

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestHeader("Authorization") String authHeader,
                                              @RequestBody ChangePasswordRequest request) {
        try {
            String token = authHeader.replace("Bearer ", "");
            String username = jwtTokenProvider.getUsernameFromToken(token);
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity.status(401).body(ApiResponse.error("Mot de passe actuel incorrect"));
            }

            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            user.setMustChangePassword(false);
            user.setUpdatedAt(java.time.LocalDateTime.now());
            userRepository.save(user);

            return ResponseEntity.ok(ApiResponse.success("Mot de passe mis a jour", null));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur: " + e.getMessage()));
        }
    }
}
