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
        // 💡 On ignore le filtrage pour l'authentification, Swagger et les WebSockets
        return path.startsWith("/api/auth")
                || path.startsWith("/auth")
                || path.startsWith("/swagger")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/ws-notifications") // Indispensable pour éviter l'erreur 500
                || path.startsWith("/ws-hospital");      // Indispensable pour la Sidebar
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        // Si pas de header Bearer, on passe au filtre suivant
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        // Validation du token
        if (!jwtTokenProvider.validateToken(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        String username = jwtTokenProvider.getUsernameFromToken(token);
        String role = jwtTokenProvider.getRoleFromToken(token);

        if (username != null && role != null &&
                SecurityContextHolder.getContext().getAuthentication() == null) {

            // --- LOGIQUE DE CORRECTION DU RÔLE ---
            String formattedRole = role.toUpperCase().trim();
            if (!formattedRole.startsWith("ROLE_")) {
                formattedRole = "ROLE_" + formattedRole;
            } else if (formattedRole.startsWith("ROLE_ROLE_")) {
                formattedRole = formattedRole.replace("ROLE_ROLE_", "ROLE_");
            }

            log.info("Authentification réussie pour: {} avec l'autorité: {}", username, formattedRole);

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
        }

        filterChain.doFilter(request, response);
    }
}