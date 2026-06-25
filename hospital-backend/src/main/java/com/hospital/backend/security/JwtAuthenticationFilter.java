package com.hospital.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.service.DeviceSessionService;
import com.hospital.backend.service.SystemConfigService;
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
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final SystemConfigService systemConfigService;
    private final DeviceSessionService deviceSessionService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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
            log.warn("🔍 [JWT DEBUG] Token invalide ou expiré - accès refusé");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Token invalide ou expiré\",\"code\":401}");
            return;
        }

        String username = jwtTokenProvider.getUsernameFromToken(token);
        String role = jwtTokenProvider.getRoleFromToken(token);

        log.info("🔍 [JWT DEBUG] Token extrait - Username: {}, Role brut: {}", username, role);

        if (username != null && role != null &&
                SecurityContextHolder.getContext().getAuthentication() == null) {

            // 🔐 VÉRIFICATION tokenVersion (force-logout SuperAdmin)
            Long tokenVersion = jwtTokenProvider.getTokenVersionFromToken(token);
            User user = userRepository.findByUsernameWithHospitalAndRole(username)
                    .or(() -> userRepository.findByEmailWithHospitalAndRole(username))
                    .orElse(null);

            if (user != null && !tokenVersion.equals(user.getTokenVersion())) {
                log.warn("🚪 [JWT] TokenVersion mismatch pour {} — token={}, base={}. Déconnexion forcée.",
                        username, tokenVersion, user.getTokenVersion());
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Session révoquée par l'administrateur\",\"code\":401}");
                return;
            }

            // ✅ CORRECTION: Ajouter le préfixe ROLE_ pour la cohérence avec Spring Security
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

            // 📱 DEVICE FINGERPRINT — enregistre l'appareil et vérifie le blocage
            // Les Super Admins sont exemptés pour éviter le verrouillage total
            boolean isSuperAdmin = formattedRole.contains("SUPERADMIN");
            String deviceId = request.getHeader("X-Device-Id");
            if (deviceId != null && !deviceId.isBlank() && user != null) {
                deviceSessionService.registerDevice(
                        deviceId,
                        user.getId(),
                        user.getUsername(),
                        request.getRemoteAddr(),
                        request.getHeader("User-Agent")
                );

                if (!isSuperAdmin && deviceSessionService.isDeviceBlocked(deviceId)) {
                    log.warn("🚫 [DEVICE] Appareil {} BLOQUÉ pour user {}", deviceId, username);
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN); // 403
                    response.setContentType("application/json");
                    response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                            "error", "Cet appareil a été bloqué par l'administrateur.",
                            "code", 403,
                            "deviceBlocked", true
                    )));
                    return;
                }
            }

            // 🛠️ MODE MAINTENANCE — après authentification, on bloque les non-admin
            if (systemConfigService.isMaintenanceMode()) {
                boolean isAdmin = formattedRole.contains("ADMIN");
                if (!isAdmin) {
                    log.warn("🚧 [MAINTENANCE] Accès refusé pour {} — mode maintenance actif", username);
                    response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE); // 503
                    response.setContentType("application/json");
                    response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                            "error", "Mode maintenance en cours. Seuls les administrateurs peuvent accéder.",
                            "code", 503,
                            "maintenance", true
                    )));
                    return;
                }
            }

            // 🏥 Vérifier si l'hôpital est désactivé et si l'utilisateur est clinique
            log.info("🏥 [JWT CHECK] User: {}, Hospital: {}, Role: {}", 
                user != null ? user.getUsername() : "null", 
                user != null && user.getHospital() != null ? user.getHospital().getNom() : "null",
                user != null && user.getRole() != null ? user.getRole().getNom() : "null");
            
            if (user != null && user.getHospital() != null) {
                log.info("🏥 [JWT CHECK] Hospital Active: {}", user.getHospital().getIsActive());
            }
            
            if (user != null && user.getHospital() != null && !Boolean.TRUE.equals(user.getHospital().getIsActive())) {
                String roleName = user.getRole() != null ? user.getRole().getNom() : "";
                log.info("🏥 [JWT CHECK] Checking clinical role: {}", roleName);
                
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

                log.info("🏥 [JWT CHECK] Is Clinical Role: {}", isClinicalRole);

                if (isClinicalRole) {
                    log.warn("🚫 [JWT BLOCKED] Hôpital désactivé pour utilisateur clinique: {}", username);
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN); // 403
                    response.setContentType("application/json");
                    response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                            "error", "Accès suspendu. Le profil de votre établissement est temporairement désactivé.",
                            "code", 403,
                            "hospitalDisabled", true
                    )));
                    return;
                }
            }
        }

        try {
            Long hospitalId = jwtTokenProvider.getHospitalIdFromToken(token);
            if (hospitalId != null) {
                HospitalTenantContext.setHospitalId(hospitalId);
            }
            filterChain.doFilter(request, response);
        } finally {
            HospitalTenantContext.clear();
        }
    }
}