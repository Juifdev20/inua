package com.hospital.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();

        // 💡 EXCLUSIONS : On ignore le filtrage pour les routes publiques, Swagger, WebSockets et les IMAGES
        return path.startsWith("/api/auth")
                || path.startsWith("/auth")
                || path.startsWith("/swagger")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/ws-notifications")
                || path.startsWith("/ws-hospital")
                || path.startsWith("/uploads/")   // ✅ Autorise l'accès direct aux fichiers sans JWT
                || path.startsWith("/profiles/");  // ✅ Autorise l'accès aux photos de profil sans JWT
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        // Si pas de header Bearer, on passe au filtre suivant (SecurityConfig prendra le relais pour l'accès)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        
        // ✅ AJOUT: Vérifier que le token n'est pas vide
        if (token == null || token.trim().isEmpty()) {
            log.warn("🔍 [JWT DEBUG] Token vide trouvé");
            filterChain.doFilter(request, response);
            return;
        }

        // Validation du token via le Provider
        if (!jwtTokenProvider.validateToken(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        String username = jwtTokenProvider.getUsernameFromToken(token);
        String role = jwtTokenProvider.getRoleFromToken(token);

        log.info("🔍 [JWT DEBUG] Token extrait - Username: {}, Role brut: {}", username, role);

        if (username != null && role != null &&
                SecurityContextHolder.getContext().getAuthentication() == null) {

        // ✅ CORRECTION: Ajouter le préfixe ROLE_ pour la cohérence avec Spring Security
        // Si le rôle ne commence pas déjà par ROLE_, on l'ajoute
        String formattedRole = role.toUpperCase().trim();
        if (!formattedRole.startsWith("ROLE_")) {
            formattedRole = "ROLE_" + formattedRole;
        }
        
        log.info("🔍 [JWT DEBUG] Rôle formaté: {} (original: {})", formattedRole, role);

            SimpleGrantedAuthority authority = new SimpleGrantedAuthority(formattedRole);

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            username,
                            null,
                            Collections.singletonList(authority)
                    );

            authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.info("🔍 [JWT DEBUG] Authentification établie pour: {} avec autorité: {}", username, authority);
        }

        filterChain.doFilter(request, response);
    }
}