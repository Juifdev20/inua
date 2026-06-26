package com.hospital.backend.security;

import com.hospital.backend.entity.User;
import com.hospital.backend.entity.Role;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.repository.PatientRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * ★ GESTIONNAIRE DE SUCCÈS OAUTH2
 * Redirige vers le frontend après connexion sociale (Google/Facebook)
 * - Si l'utilisateur a déjà un mot de passe → Génère JWT et redirige vers dashboard
 * - Si l'utilisateur vient d'être créé → Redirige vers /complete-setup pour définir un mot de passe
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PatientRepository patientRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        if (!(authentication instanceof OAuth2AuthenticationToken)) {
            log.error("❌ [OAuth2] Type d'authentification inattendu: {}", authentication.getClass());
            super.onAuthenticationSuccess(request, response, authentication);
            return;
        }

        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oAuth2User = oauthToken.getPrincipal();
        String provider = oauthToken.getAuthorizedClientRegistrationId();

        // Extraire l'email des attributs
        Map<String, Object> attributes = oAuth2User.getAttributes();
        String email = extractEmail(provider, attributes);

        log.info("🔑 [OAuth2] Connexion réussie via {} - Email: {}", provider, email);

        // Rechercher l'utilisateur en base
        Optional<User> userOpt = userRepository.findByEmail(email);

        // ★ CAS 0 : Utilisateur n'existe pas → Créer automatiquement
        if (userOpt.isEmpty()) {
            log.info("🆕 [OAuth2] Utilisateur non trouvé - Création automatique pour: {}", email);

            // Créer un nouvel utilisateur avec les infos OAuth2
            String firstName = extractFirstName(provider, attributes);
            String lastName = extractLastName(provider, attributes);
            
            // ★ DEBUG UTF-8
            log.info("🔤 [OAuth2 UTF-8 Debug] firstName bytes: {}", firstName != null ? firstName.getBytes(java.nio.charset.StandardCharsets.UTF_8) : "null");
            log.info("🔤 [OAuth2 UTF-8 Debug] lastName bytes: {}", lastName != null ? lastName.getBytes(java.nio.charset.StandardCharsets.UTF_8) : "null");
            log.info("🔤 [OAuth2 UTF-8 Debug] firstName value: {}", firstName);
            log.info("🔤 [OAuth2 UTF-8 Debug] lastName value: {}", lastName);
            
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setUsername(email.split("@")[0]); // Utiliser la partie avant @ comme username
            newUser.setFirstName(firstName);
            newUser.setLastName(lastName);
            newUser.setIsActive(true);
            newUser.setMustChangePassword(true); // Forcer le changement de mot de passe
            newUser.setNotificationEnabled(true);
            newUser.setSoundEnabled(true);
            newUser.setOauthProvider(provider); // ★ IMPORTANT: Définir le provider OAuth2
            // Mot de passe temporaire hashé (sera changé via complete-setup)
            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
            newUser.setPassword(encoder.encode("TEMP_OAUTH_PASSWORD_" + System.currentTimeMillis()));

            // Assigner le rôle PATIENT par défaut
            Role patientRole = roleRepository.findByNom("PATIENT")
                    .orElse(roleRepository.findByNom("ROLE_PATIENT")
                            .orElse(roleRepository.findAll().stream()
                                    .findFirst()
                                    .orElseThrow(() -> new RuntimeException("Aucun rôle disponible dans la base de données"))));
            newUser.setRole(patientRole);
            log.info("✅ [OAuth2] Rôle assigné: {}", patientRole.getNom());

            // Sauvegarder l'utilisateur
            User savedUser = userRepository.save(newUser);
            log.info("✅ [OAuth2] Utilisateur créé avec ID: {}", savedUser.getId());

            // ★ CRÉER LE DOSSIER PATIENT LIÉ
            Patient patient = Patient.builder()
                    .user(savedUser)
                    .firstName(savedUser.getFirstName())
                    .lastName(savedUser.getLastName())
                    .email(savedUser.getEmail())
                    .phoneNumber(savedUser.getPhoneNumber())
                    .patientCode("PAT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                    .isActive(true)
                    .build();
            patientRepository.save(patient);
            log.info("✅ [OAuth2] Dossier Patient créé pour l'utilisateur ID: {}", savedUser.getId());

            // Rediriger vers complete-setup pour définir le mot de passe
            String setupToken = jwtTokenProvider.generateToken(savedUser.getUsername(), 15);
            String targetUrl = String.format("%s/complete-setup?email=%s&token=%s&provider=%s",
                    frontendUrl,
                    email,
                    setupToken,
                    provider
            );
            log.info("🔗 [OAuth2] Redirection vers complete-setup pour nouvel utilisateur");
            getRedirectStrategy().sendRedirect(request, response, targetUrl);
            return;
        }

        User user = userOpt.get();

        // 🏥 Vérifier si l'hôpital est désactivé et si l'utilisateur est clinique
        if (user.getHospital() != null && !Boolean.TRUE.equals(user.getHospital().getIsActive())) {
            String roleName = user.getRole() != null ? user.getRole().getNom() : "";
            
            // Exclure les super admins du blocage
            boolean isSuperAdmin = roleName.equals("ROLE_SUPER_ADMIN") ||
                    roleName.equals("SUPER_ADMIN");
            
            if (isSuperAdmin) {
                log.info("🏥 [OAUTH2 CHECK] Super Admin détecté, blocage ignoré");
                // Ne pas bloquer les super admins
            } else {
                boolean isClinicalRole = roleName.equals("ROLE_DOCTOR") ||
                        roleName.equals("ROLE_DOCTEUR") ||
                        roleName.equals("DOCTOR") ||
                        roleName.equals("DOCTEUR") ||
                        roleName.equals("ROLE_LABO") ||
                        roleName.equals("ROLE_LABORATOIRE") ||
                        roleName.equals("LABO") ||
                        roleName.equals("LABORATOIRE") ||
                        roleName.equals("ROLE_PHARMACY") ||
                        roleName.equals("ROLE_PHARMACIE") ||
                        roleName.equals("PHARMACY") ||
                        roleName.equals("PHARMACIE") ||
                        roleName.equals("ROLE_PHARMACIST") ||
                        roleName.equals("PHARMACIST") ||
                        roleName.equals("ROLE_RECEPTION") ||
                        roleName.equals("RECEPTION") ||
                        roleName.equals("ROLE_FINANCE") ||
                        roleName.equals("FINANCE") ||
                        roleName.equals("ROLE_CAISSIER") ||
                        roleName.equals("CAISSIER");

                if (isClinicalRole) {
                    log.warn("🚫 [OAUTH2 BLOCKED] Hôpital désactivé pour utilisateur clinique: {}", user.getUsername());
                    String targetUrl = String.format("%s/login?error=hospital_disabled", frontendUrl);
                    getRedirectStrategy().sendRedirect(request, response, targetUrl);
                    return;
                }
            }
        }

        // Vérifier si l'utilisateur a déjà un mot de passe défini
        boolean hasPassword = user.getPassword() != null && !user.getPassword().isEmpty();
        boolean mustChangePassword = Boolean.TRUE.equals(user.getMustChangePassword());

        // ★ CAS 1 : Utilisateur nouveau ou sans mot de passe → Redirection vers complete-setup
        if (!hasPassword || mustChangePassword) {
            log.info("🆕 [OAuth2] Nouvel utilisateur ou mot de passe non défini - Redirection vers complete-setup");

            // Générer un token temporaire pour le setup (valide 15 min)
            String setupToken = jwtTokenProvider.generateToken(user.getUsername(), 15);

            String targetUrl = String.format("%s/complete-setup?email=%s&token=%s&provider=%s",
                    frontendUrl,
                    email,
                    setupToken,
                    provider
            );

            log.info("🔗 [OAuth2] Redirection vers: {}", targetUrl);
            getRedirectStrategy().sendRedirect(request, response, targetUrl);
            return;
        }

        // ★ CAS 2 : Utilisateur existant avec mot de passe → Connexion normale avec JWT
        log.info("✅ [OAuth2] Utilisateur existant avec mot de passe - Génération JWT");

        // Générer les tokens JWT
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getUsername());

        // Redirection vers le frontend avec les tokens
        String targetUrl = String.format("%s/oauth2/callback?accessToken=%s&refreshToken=%s&provider=%s",
                frontendUrl,
                accessToken,
                refreshToken,
                provider
        );

        log.info("🔗 [OAuth2] Redirection vers dashboard avec tokens");
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    /**
     * Extrait l'email des attributes selon le provider
     */
    private String extractEmail(String provider, Map<String, Object> attributes) {
        switch (provider.toLowerCase()) {
            case "google":
                return (String) attributes.get("email");
            case "facebook":
                return (String) attributes.get("email");
            default:
                return (String) attributes.get("email");
        }
    }

    /**
     * Extrait le prénom des attributes selon le provider
     */
    private String extractFirstName(String provider, Map<String, Object> attributes) {
        switch (provider.toLowerCase()) {
            case "google":
                return (String) attributes.get("given_name");
            case "facebook":
                return (String) attributes.get("first_name");
            default:
                return "";
        }
    }

    /**
     * Extrait le nom de famille des attributes selon le provider
     */
    private String extractLastName(String provider, Map<String, Object> attributes) {
        switch (provider.toLowerCase()) {
            case "google":
                return (String) attributes.get("family_name");
            case "facebook":
                return (String) attributes.get("last_name");
            default:
                return "";
        }
    }
}
