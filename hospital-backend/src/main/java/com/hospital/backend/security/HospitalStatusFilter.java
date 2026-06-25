package com.hospital.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.backend.entity.Hospital;
import com.hospital.backend.repository.HospitalRepository;
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

        filterChain.doFilter(request, response);
    }
}
