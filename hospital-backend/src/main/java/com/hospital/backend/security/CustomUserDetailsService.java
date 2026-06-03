package com.hospital.backend.security;

import com.hospital.backend.entity.User;
import com.hospital.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j; // Import pour les logs
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j // Ajout pour permettre l'utilisation de log.warn
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        // 🔧 PERMET le login par username OU par email (OAuth2 users n'ont pas forcément
        // leur email comme username — ex: google user a username = partie avant @)
        User user = userRepository.findByUsername(usernameOrEmail)
                .or(() -> userRepository.findByEmail(usernameOrEmail))
                .orElseThrow(() ->
                        new UsernameNotFoundException("Utilisateur non trouvé : " + usernameOrEmail)
                );

        // ✅ LOG DE SÉCURITÉ : Trace les tentatives sur comptes inactifs
        if (user.getIsActive() != null && !user.getIsActive()) {
            log.warn("🚨 TENTATIVE D'ACCÈS REFUSÉE : Le compte '{}' est désactivé (Statut: INACTIF).", usernameOrEmail);
            // On continue le flux, Spring Security bloquera l'accès via CustomUserDetails.isEnabled()
        }

        if (user.getRole() == null) {
            log.error("❌ ERREUR CRITIQUE : L'utilisateur '{}' n'a aucun rôle assigné.", usernameOrEmail);
            throw new RuntimeException("L'utilisateur n'a aucun rôle assigné");
        }

        return new CustomUserDetails(user);
    }
}