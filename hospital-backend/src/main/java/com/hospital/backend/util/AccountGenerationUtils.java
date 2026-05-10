package com.hospital.backend.util;

import com.hospital.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * ★ UTILITAIRE DE GÉNÉRATION DE COMPTE UTILISATEUR
 * Génère des identifiants uniques pour patients et staff
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AccountGenerationUtils {

    private final UserRepository userRepository;

    // Mot de passe par défaut pour les nouveaux comptes
    public static final String DEFAULT_PASSWORD = "Inua@2026";

    /**
     * Génère un username unique au format prenom.nom
     * Règles : minuscules, sans accents, sans espaces, sans caractères spéciaux
     * Si existe déjà : ajoute un numéro (jean.dupont1, jean.dupont2...)
     *
     * @param firstName Prénom
     * @param lastName  Nom
     * @return Username unique
     */
    public String generateUniqueUsername(String firstName, String lastName) {
        if (firstName == null || firstName.trim().isEmpty()) {
            firstName = "user";
        }
        if (lastName == null || lastName.trim().isEmpty()) {
            lastName = "unknown";
        }

        // Normaliser : minuscules + suppression accents + suppression caractères spéciaux
        String normalizedFirst = normalizeString(firstName);
        String normalizedLast = normalizeString(lastName);

        // Format base : prenom.nom
        String baseUsername = normalizedFirst + "." + normalizedLast;

        // Vérifier l'unicité et ajouter un suffixe si nécessaire
        String username = baseUsername;
        int counter = 1;

        while (userRepository.existsByUsername(username)) {
            username = baseUsername + counter;
            counter++;
        }

        log.info("✅ Username généré : {} (tentatives: {})", username, counter);
        return username;
    }

    /**
     * Génère un username basé sur le téléphone si nom/prenom insuffisants
     * Format : user.{derniers_4_chiffres}
     *
     * @param phoneNumber Numéro de téléphone
     * @return Username unique basé sur le téléphone
     */
    public String generateUsernameFromPhone(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            return generateUniqueUsername("user", "unknown");
        }

        // Extraire les 4 derniers chiffres
        String digits = phoneNumber.replaceAll("\\D", "");
        String suffix = digits.length() >= 4 ? digits.substring(digits.length() - 4) : digits;

        String baseUsername = "user." + suffix;
        String username = baseUsername;
        int counter = 1;

        while (userRepository.existsByUsername(username)) {
            username = baseUsername + counter;
            counter++;
        }

        log.info("✅ Username téléphone généré : {}", username);
        return username;
    }

    /**
     * Génère un email par défaut si non fourni
     * Format : username@inuaafia.local
     *
     * @param username Username
     * @return Email par défaut
     */
    public String generateDefaultEmail(String username) {
        return username + "@inuaafia.local";
    }

    /**
     * Normalise une chaîne : minuscules, sans accents, alphanumérique uniquement
     *
     * @param input Chaîne à normaliser
     * @return Chaîne normalisée
     */
    private String normalizeString(String input) {
        if (input == null) return "";

        // 1. Minuscules
        String normalized = input.toLowerCase();

        // 2. Suppression des accents (é->e, à->a, etc.)
        normalized = Normalizer.normalize(normalized, Normalizer.Form.NFD);
        normalized = Pattern.compile("\\p{InCombiningDiacriticalMarks}+").matcher(normalized).replaceAll("");

        // 3. Suppression des espaces et caractères spéciaux, garder uniquement alphanumérique
        normalized = normalized.replaceAll("[^a-z0-9]", "");

        return normalized.isEmpty() ? "x" : normalized;
    }

    /**
     * Vérifie si un username existe déjà
     *
     * @param username Username à vérifier
     * @return true si existe
     */
    public boolean usernameExists(String username) {
        return userRepository.existsByUsername(username);
    }
}
