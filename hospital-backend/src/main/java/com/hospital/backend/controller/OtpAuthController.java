package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.dto.AuthResponse;
import com.hospital.backend.dto.UserDTO;
import com.hospital.backend.entity.Role;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.security.JwtTokenProvider;
import com.hospital.backend.service.EmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

/**
 * ★ CONTRÔLEUR POUR AUTHENTIFICATION PAR CODE TEMPORAIRE (OTP / MAGIC CODE)
 * Connexion sans mot de passe via un code à 6 chiffres envoyé par email
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "OTP Authentication", description = "Authentification par code temporaire (Magic Code)")
public class OtpAuthController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EmailService emailService;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    private static final int OTP_VALIDITY_MINUTES = 10;
    private static final String DEFAULT_PASSWORD = "Inua@2026";

    /**
     * ★ ÉTAPE 1 : DEMANDE DE CODE TEMPORAIRE
     * Génère un code à 6 chiffres, le sauvegarde et l'envoie par email
     */
    @PostMapping("/request-otp")
    @Operation(summary = "Demander un code de connexion temporaire",
            description = "Envoie un code à 6 chiffres valable 10 minutes à l'email fourni")
    public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");

        // Validation de l'email
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("L'adresse email est requise"));
        }

        // Normaliser l'email
        email = email.trim().toLowerCase();

        // Vérifier si l'utilisateur existe
        Optional<User> userOpt = userRepository.findByEmail(email);
                if (userOpt.isEmpty()) {
                     log.warn("⚠️ [OTP] Tentative avec email inexistant: {}", email);
                       return ResponseEntity.badRequest()
                               .body(ApiResponse.error("Aucun compte n'est associé à cet email. Veuillez créer un compte."));
                   }

        User user = userOpt.get();

        // Générer le code à 6 chiffres
        String otpCode = generateOtpCode();

        // Sauvegarder le code et sa date d'expiration
        user.setLoginCode(otpCode);
        user.setCodeExpiry(LocalDateTime.now().plusMinutes(OTP_VALIDITY_MINUTES));
        userRepository.save(user);

        // Envoyer le code par email
        try {
            emailService.sendMagicCodeEmail(email, user.getFirstName(), otpCode);
            log.info("✅ [OTP] Code envoyé à: {}", email);
        } catch (Exception e) {
            log.error("❌ [OTP] Erreur envoi email à {}: {}", email, e.getMessage());
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Erreur lors de l'envoi du code"));
        }

        return ResponseEntity.ok(ApiResponse.success(
                "Un code de connexion a été envoyé à votre adresse email",
                Map.of(
                        "email", maskEmail(email),
                        "validityMinutes", OTP_VALIDITY_MINUTES
                )
        ));
    }

    /**
     * ★ ÉTAPE 2 : VÉRIFICATION DU CODE ET CONNEXION
     * Valide le code, génère un token JWT et réinitialise le code
     */
    @PostMapping("/verify-otp")
    @Operation(summary = "Vérifier le code et se connecter",
            description = "Valide le code temporaire et retourne un token JWT")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String code = request.get("code");

        // Validation
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("L'adresse email est requise"));
        }
        if (code == null || code.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Le code est requis"));
        }

        email = email.trim().toLowerCase();
        code = code.trim();

        // Vérifier le code
        Optional<User> userOpt = userRepository.findValidLoginCode(email, code);

        if (userOpt.isEmpty()) {
            // Vérifier si le code existe mais est expiré
            Optional<User> userWithExpiredCode = userRepository.findByEmail(email);
            if (userWithExpiredCode.isPresent()) {
                User user = userWithExpiredCode.get();
                if (user.getLoginCode() != null && user.getLoginCode().equals(code)) {
                    if (user.getCodeExpiry() != null && user.getCodeExpiry().isBefore(LocalDateTime.now())) {
                        log.warn("⚠️ [OTP] Code expiré pour: {}", email);
                        return ResponseEntity.badRequest()
                                .body(ApiResponse.error("Code expiré. Veuillez demander un nouveau code."));
                    }
                }
            }

            log.warn("⚠️ [OTP] Code invalide pour: {}", email);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Code invalide"));
        }

        User user = userOpt.get();

        // Vérifier si l'utilisateur a un mot de passe défini
        // Si c'est une connexion OAuth2 sans mot de passe, on le force à en définir un
        boolean needsPasswordSetup = user.getPassword() == null ||
                passwordEncoder.matches(DEFAULT_PASSWORD, user.getPassword()) &&
                        Boolean.TRUE.equals(user.getMustChangePassword());

        // Si l'utilisateur n'a pas de mot de passe (OAuth2), on lui en attribue un temporaire
        // mais on force le changement
        if (user.getPassword() == null || user.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
            user.setMustChangePassword(true);
        }

        // Générer le token JWT
        String token = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getUsername());

        // Invalider le code après utilisation
        user.setLoginCode(null);
        user.setCodeExpiry(null);
        userRepository.save(user);

        log.info("✅ [OTP] Connexion réussie pour: {}", email);

        // Construire la réponse
        AuthResponse authResponse = AuthResponse.builder()
                .accessToken(token)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(mapToUserDTO(user))
                .build();

        return ResponseEntity.ok(ApiResponse.success("Connexion réussie", authResponse));
    }

    /**
     * ★ VÉRIFICATION DU STATUT OAUTH2
     * Permet de vérifier si un email est associé à un compte OAuth2
     */
    @GetMapping("/oauth-status")
    @Operation(summary = "Vérifier le statut OAuth2 d'un email",
            description = "Vérifie si l'email est associé à un compte OAuth2 ou classique")
    public ResponseEntity<?> checkOauthStatus(@RequestParam String email) {
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Email requis"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim().toLowerCase());

        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(Map.of(
                    "exists", false,
                    "oauthProvider", null,
                    "hasPassword", false
            )));
        }

        User user = userOpt.get();
        boolean hasPassword = user.getPassword() != null &&
                !passwordEncoder.matches(DEFAULT_PASSWORD, user.getPassword());

        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "exists", true,
                "oauthProvider", user.getOauthProvider(),
                "hasPassword", hasPassword,
                "mustChangePassword", Boolean.TRUE.equals(user.getMustChangePassword())
        )));
    }

    // ========== MÉTHODES UTILITAIRES ==========

    /**
     * Génère un code à 6 chiffres aléatoire
     */
    private String generateOtpCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000); // Entre 100000 et 999999
        return String.valueOf(code);
    }

    /**
     * Masque partiellement l'email pour l'affichage
     */
    private String maskEmail(String email) {
        if (email == null || email.length() < 5) return email;

        int atIndex = email.indexOf('@');
        if (atIndex < 2) return email;

        String localPart = email.substring(0, atIndex);
        String domain = email.substring(atIndex);

        if (localPart.length() <= 2) return email;

        String visible = localPart.substring(0, 2);
        String masked = "*".repeat(localPart.length() - 2);
        return visible + masked + domain;
    }

    /**
     * Convertit un User en UserDTO
     */
    private UserDTO mapToUserDTO(User user) {
        if (user == null) return null;
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .nom(user.getLastName())
                .prenom(user.getFirstName())
                .phoneNumber(user.getPhoneNumber())
                .photoUrl(user.getPhotoUrl())
                .bloodType(user.getBloodType())
                .address(user.getAddress())
                .dateOfBirth(user.getDateOfBirth())
                .department(user.getDepartment() != null ? user.getDepartment().getNom() : null)
                .role(user.getRole() != null ? user.getRole().getNom() : "ROLE_USER")
                .roleName(user.getRole() != null ? user.getRole().getNom().replace("ROLE_", "") : "USER")
                .isActive(user.getIsActive())
                .notificationEnabled(user.getNotificationEnabled())
                .soundEnabled(user.getSoundEnabled())
                .preferredLanguage(user.getPreferredLanguage())
                .mustChangePassword(user.getMustChangePassword())
                .oauthProvider(user.getOauthProvider())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

}
