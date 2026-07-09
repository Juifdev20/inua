package com.hospital.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.backend.entity.Hospital;
import com.hospital.backend.repository.HospitalRepository;
import com.hospital.backend.service.SubscriptionService;
import org.springframework.context.annotation.Lazy;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class HospitalStatusFilter extends OncePerRequestFilter {

    private final HospitalRepository hospitalRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // @Lazy pour éviter tout cycle d'initialisation (le service dépend de nombreux repositories)
    @org.springframework.beans.factory.annotation.Autowired
    @Lazy
    private SubscriptionService subscriptionService;

    private static final List<String> BLOCKED_ROLES = Arrays.asList(
            "ROLE_DOCTOR",
            "ROLE_LABO",
            "ROLE_PHARMACY",
            "ROLE_PHARMACIST",
            "ROLE_RECEPTION",
            "ROLE_FINANCE",
            "ROLE_CAISSIER"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/api/auth")
                || path.startsWith("/auth")
                || path.startsWith("/swagger")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/ws-notifications")
                || path.startsWith("/ws-hospital")
                || path.startsWith("/uploads/")
                || path.startsWith("/profiles/")
                || path.startsWith("/api/superadmin");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        Long hospitalId = HospitalTenantContext.getHospitalId();
        if (hospitalId == null) {
            filterChain.doFilter(request, response);
            return;
        }

        Hospital hospital = hospitalRepository.findById(hospitalId).orElse(null);
        if (hospital == null) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!Boolean.TRUE.equals(hospital.getIsActive())) {
            String role = SecurityContextHolder.getContext().getAuthentication()
                    .getAuthorities().iterator().next().getAuthority();

            if (BLOCKED_ROLES.contains(role)) {
                log.warn("🚫 [HOSPITAL STATUS] Accès refusé pour {} - Hôpital {} désactivé", role, hospital.getNom());
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                        "error", "Établissement désactivé",
                        "code", 403,
                        "hospitalDisabled", true
                )));
                return;
            }
        }

        // 💳 BLOCAGE PAR ABONNEMENT EXPIRÉ (hors délai de grâce) — rôles cliniques uniquement.
        // L'admin et les patients ne sont PAS dans BLOCKED_ROLES → jamais bloqués ici,
        // ce qui permet à l'admin de renouveler l'abonnement via la page Facturation.
        try {
            if (subscriptionService != null && subscriptionService.isClinicalAccessBlocked(hospital)) {
                var auth = SecurityContextHolder.getContext().getAuthentication();
                String role = (auth != null && auth.getAuthorities().iterator().hasNext())
                        ? auth.getAuthorities().iterator().next().getAuthority() : "";
                if (BLOCKED_ROLES.contains(role)) {
                    log.warn("🚫 [SUBSCRIPTION] Accès refusé pour {} - Abonnement expiré ({})", role, hospital.getNom());
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                            "error", "Votre abonnement est épuisé. Veuillez contacter le service Inua Afya "
                                    + "ou votre administrateur local pour le renouveler.",
                            "code", 403,
                            "subscriptionExpired", true
                    )));
                    return;
                }
            }
        } catch (Exception e) {
            // Ne jamais bloquer le trafic si la vérification d'abonnement échoue
            log.debug("[SUBSCRIPTION] Vérification blocage ignorée: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
