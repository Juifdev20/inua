package com.hospital.backend.service;

import com.hospital.backend.entity.Role;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

/**
 * ★ SERVICE OAUTH2 PERSONNALISÉ
 * Gère l'authentification via Google et Facebook
 * Crée automatiquement un utilisateur si l'email n'existe pas
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        // Récupérer les infos de l'utilisateur depuis le provider OAuth2
        OAuth2User oAuth2User = delegate.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        String provider = registrationId.toLowerCase(); // "google" ou "facebook"

        // Extraire les attributs selon le provider
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String email = extractEmail(provider, attributes);
        String firstName = extractFirstName(provider, attributes);
        String lastName = extractLastName(provider, attributes);
        String oauthId = extractOauthId(provider, attributes);

        log.info("🔑 [OAuth2] Connexion via {} - Email: {}", provider, email);

        // Vérifier si l'utilisateur existe déjà par email
        Optional<User> existingUserByEmail = userRepository.findByEmail(email);

        if (existingUserByEmail.isPresent()) {
            User user = existingUserByEmail.get();

            // Mettre à jour les infos OAuth2 si ce n'est pas déjà un compte OAuth2
            if (user.getOauthProvider() == null) {
                user.setOauthProvider(provider);
                user.setOauthId(oauthId);
                userRepository.save(user);
                log.info("✅ [OAuth2] Compte existant lié à {}", provider);
            }

            return createOAuth2User(user, attributes, provider);
        }

        // Vérifier si l'utilisateur existe par OAuth ID
        Optional<User> existingUserByOauth = userRepository.findByOauthProviderAndOauthId(provider, oauthId);

        if (existingUserByOauth.isPresent()) {
            User user = existingUserByOauth.get();
            return createOAuth2User(user, attributes, provider);
        }

        // ★ NOUVEL UTILISATEUR - Création automatique
        log.info("🆕 [OAuth2] Création nouveau compte pour: {} via {}", email, provider);

        User newUser = createNewOAuth2User(email, firstName, lastName, provider, oauthId);

        return createOAuth2User(newUser, attributes, provider);
    }

    /**
     * Crée un nouvel utilisateur à partir des données OAuth2
     */
    private User createNewOAuth2User(String email, String firstName, String lastName,
                                       String provider, String oauthId) {
        // Générer un username unique
        String baseUsername = generateUsername(firstName, lastName);
        String username = baseUsername;
        int counter = 1;

        while (userRepository.existsByUsername(username)) {
            username = baseUsername + counter;
            counter++;
        }

        // Récupérer le rôle PATIENT par défaut
        Role patientRole = roleRepository.findByNom("ROLE_PATIENT")
                .orElseThrow(() -> new RuntimeException("Rôle ROLE_PATIENT non trouvé"));

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setFirstName(firstName != null ? firstName : "User");
        user.setLastName(lastName != null ? lastName : "");
        user.setOauthProvider(provider);
        user.setOauthId(oauthId);
        user.setRole(patientRole);
        user.setIsActive(true);
        user.setMustChangePassword(true); // Force la définition d'un mot de passe

        // Pas de mot de passe pour l'instant - sera défini lors du complete-setup
        user.setPassword(null);

        User savedUser = userRepository.save(user);
        log.info("✅ [OAuth2] Utilisateur créé: {} (ID: {})", username, savedUser.getId());

        return savedUser;
    }

    /**
     * Crée un OAuth2User Spring Security à partir de notre entité User
     */
    private OAuth2User createOAuth2User(User user, Map<String, Object> attributes, String provider) {
        // Déterminer le nom d'attribut principal selon le provider
        String userNameAttributeName = provider.equals("google") ? "sub" : "id";

        // Créer les authorities
        String roleName = user.getRole() != null ? user.getRole().getNom() : "ROLE_PATIENT";

        return new DefaultOAuth2User(
                Collections.singleton(() -> roleName),
                attributes,
                userNameAttributeName
        );
    }

    // ========== EXTRACTEURS D'ATTRIBUTS PAR PROVIDER ==========

    private String extractEmail(String provider, Map<String, Object> attributes) {
        switch (provider) {
            case "google":
                return (String) attributes.get("email");
            case "facebook":
                return (String) attributes.get("email");
            default:
                return (String) attributes.get("email");
        }
    }

    private String extractFirstName(String provider, Map<String, Object> attributes) {
        switch (provider) {
            case "google":
                return (String) attributes.get("given_name");
            case "facebook":
                // Facebook peut avoir "first_name" ou "name" séparé
                String name = (String) attributes.get("first_name");
                if (name == null) {
                    String fullName = (String) attributes.get("name");
                    if (fullName != null) {
                        String[] parts = fullName.split(" ");
                        return parts[0];
                    }
                }
                return name;
            default:
                return (String) attributes.get("given_name");
        }
    }

    private String extractLastName(String provider, Map<String, Object> attributes) {
        switch (provider) {
            case "google":
                return (String) attributes.get("family_name");
            case "facebook":
                String name = (String) attributes.get("last_name");
                if (name == null) {
                    String fullName = (String) attributes.get("name");
                    if (fullName != null) {
                        String[] parts = fullName.split(" ");
                        return parts.length > 1 ? parts[parts.length - 1] : "";
                    }
                }
                return name;
            default:
                return (String) attributes.get("family_name");
        }
    }

    private String extractOauthId(String provider, Map<String, Object> attributes) {
        switch (provider) {
            case "google":
                return (String) attributes.get("sub");
            case "facebook":
                return (String) attributes.get("id");
            default:
                return String.valueOf(attributes.get("id"));
        }
    }

    // ========== UTILITAIRES ==========

    /**
     * Génère un username à partir du nom/prénom
     */
    private String generateUsername(String firstName, String lastName) {
        String normalizedFirst = normalizeString(firstName != null ? firstName : "user");
        String normalizedLast = normalizeString(lastName != null ? lastName : "unknown");
        return normalizedFirst + "." + normalizedLast;
    }

    /**
     * Normalise une chaîne pour le username
     */
    private String normalizeString(String input) {
        if (input == null) return "";
        return input.toLowerCase()
                .replaceAll("[éèêë]", "e")
                .replaceAll("[àâä]", "a")
                .replaceAll("[îï]", "i")
                .replaceAll("[ôö]", "o")
                .replaceAll("[ùûü]", "u")
                .replaceAll("ç", "c")
                .replaceAll("[^a-z0-9]", "");
    }
}
