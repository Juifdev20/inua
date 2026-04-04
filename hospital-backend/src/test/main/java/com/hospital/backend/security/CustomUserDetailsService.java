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
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new UsernameNotFoundException("Utilisateur non trouvé : " + username)
                );

        // ✅ LOG DE SÉCURITÉ : Trace les tentatives sur comptes inactifs
        if (user.getIsActive() != null && !user.getIsActive()) {
            log.warn("🚨 TENTATIVE D'ACCÈS REFUSÉE : Le compte '{}' est désactivé (Statut: INACTIF).", username);
            // On continue le flux, Spring Security bloquera l'accès via CustomUserDetails.isEnabled()
        }

        if (user.getRole() == null) {
            log.error("❌ ERREUR CRITIQUE : L'utilisateur '{}' n'a aucun rôle assigné.", username);
            throw new RuntimeException("L'utilisateur n'a aucun rôle assigné");
        }

        return new CustomUserDetails(user);
    }
}