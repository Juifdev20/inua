package com.hospital.backend.config;

import com.hospital.backend.security.CustomUserDetailsService;
import com.hospital.backend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomUserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1. CORS en premier
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        // ════════════════════════════════════════════
                        // Requêtes de vérification (Preflight)
                        // ════════════════════════════════════════════
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // ════════════════════════════════════════════
                        // ACCÈS PUBLIC
                        // ════════════════════════════════════════════
                        .requestMatchers("/health").permitAll() // <--- AJOUTE CETTE LIGNE ICI ✅
                        .requestMatchers("/api/auth/**", "/auth/**", "/api/v1/auth/**").permitAll()
                        .requestMatchers("/uploads/**", "/profiles/**", "/api/uploads/**", "/api/profiles/**").permitAll()
                        .requestMatchers("/uploads/patients/**", "/uploads/doctors/**", "/uploads/staff/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/ws-hospital/**", "/ws-notifications/**").permitAll()
                        .requestMatchers("/ws-hospital/info/**", "/ws-notifications/info/**").permitAll()

                        // ════════════════════════════════════════════
                        // CONSULTATIONS
                        // ════════════════════════════════════════════
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/consultations/**", "/api/consultations/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_PATIENT")

                        .requestMatchers(HttpMethod.PUT, "/api/v1/consultations/*/accept-reschedule").hasAuthority("ROLE_PATIENT")
                        .requestMatchers("/api/v1/consultations/*/decision", "/api/v1/consultations/*/start").hasAuthority("ROLE_DOCTEUR")
                        .requestMatchers("/api/v1/consultations/book", "/api/consultations/book").hasAnyAuthority("ROLE_PATIENT", "ROLE_ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/consultations/**", "/api/consultations/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR", "ROLE_PATIENT", "ROLE_RECEPTION")

                        // ════════════════════════════════════════════
                        // PATIENTS
                        // ════════════════════════════════════════════
                        .requestMatchers("/api/v1/patients/me", "/api/patients/me").authenticated()
                        .requestMatchers("/api/v1/patients/all", "/api/patients/all", "/api/v1/patients/count")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_DOCTEUR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/patients/*/deactivate")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION")
                        .requestMatchers("/api/v1/patients/**", "/api/patients/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_PATIENT", "ROLE_DOCTEUR")

                        // ════════════════════════════════════════════
                        // ★ DOCTEURS & USERS — CORRIGÉ : FINANCE ajouté
                        // ════════════════════════════════════════════
                        .requestMatchers(HttpMethod.POST, "/api/v1/doctors/documents/upload").hasAuthority("ROLE_DOCTEUR")

                        // ★ CORRIGÉ : La caisse/finance doit pouvoir voir les médecins disponibles
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/doctors")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_FINANCE", "ROLE_CAISSIER")

                        .requestMatchers("/api/v1/users/profile", "/api/admin/update-profile/**").authenticated()

                        // ════════════════════════════════════════════
                        // DOCTEUR ENDPOINTS
                        // ════════════════════════════════════════════
                        .requestMatchers(HttpMethod.GET, "/api/v1/doctor/**").hasAuthority("ROLE_DOCTEUR")
                        .requestMatchers(HttpMethod.GET, "/api/doctor/**").hasAuthority("ROLE_DOCTEUR")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/doctor/**").hasAuthority("ROLE_DOCTEUR")
                        .requestMatchers(HttpMethod.PUT, "/api/doctor/**").hasAuthority("ROLE_DOCTEUR")
                        .requestMatchers("/api/v1/doctor/**").hasAuthority("ROLE_DOCTEUR")
                        .requestMatchers("/api/doctor/**").hasAuthority("ROLE_DOCTEUR")
                        .requestMatchers("/api/v1/doctors/**").hasAuthority("ROLE_DOCTEUR")
                        .requestMatchers("/api/doctors/**").hasAuthority("ROLE_DOCTEUR")

                        // ════════════════════════════════════════════
                        // ★ PRESCRIPTION INVOICES — NOUVEAU (PHARMACY + FINANCE)
                        // ════════════════════════════════════════════
                        .requestMatchers("/api/finance/prescription/**", "/api/v1/finance/prescription/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_FINANCE", "ROLE_CAISSIER", "ROLE_PHARMACIE", "ROLE_PHARMACIST")
                        
                        // ════════════════════════════════════════════
                        // ★ FINANCE / CAISSE — PLUS PERMISSIF
                        // ════════════════════════════════════════════
                        .requestMatchers("/api/finance/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_FINANCE", "ROLE_CAISSIER", "ROLE_PHARMACIE", "ROLE_PHARMACIST", "ROLE_RECEPTION")
                        
                        // ════════════════════════════════════════════
                        // ★ TEST ENDPOINTS — TEMPORAIRE
                        // ════════════════════════════════════════════
                        .requestMatchers("/api/finance/prescription/test").permitAll()

                        // ════════════════════════════════════════════
                        // ADMIN & RECEPTION
                        // ════════════════════════════════════════════
                        .requestMatchers("/api/v1/admin/**", "/api/v1/audit/**").hasAuthority("ROLE_ADMIN")
                        .requestMatchers("/api/v1/admissions/**", "/api/admissions/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_DOCTEUR", "ROLE_FINANCE", "ROLE_CAISSIER")

                        // ════════════════════════════════════════════
                        // CONSULTATIONS — Autorisations par méthode
                        // ════════════════════════════════════════════
                        .requestMatchers(HttpMethod.GET, "/api/v1/consultations/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR", "ROLE_RECEPTION", "ROLE_PATIENT")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/consultations/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR")
                        .requestMatchers("/api/v1/consultations/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_DOCTEUR")

                        // ════════════════════════════════════════════
                        // RÉCEPTION ENDPOINTS
                        // ════════════════════════════════════════════
                        .requestMatchers("/api/v1/reception/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_FINANCE", "ROLE_CAISSIER")

                        // ════════════════════════════════════════════
                        // DOCUMENTS
                        // ════════════════════════════════════════════
                        .requestMatchers(HttpMethod.GET, "/api/v1/documents/**", "/api/documents/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_DOCTEUR")
                        .requestMatchers("/api/v1/documents/**", "/api/documents/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_DOCTEUR")

                        // ════════════════════════════════════════════
                        // UPLOADS ET RESSOURCES STATIQUES
                        // ════════════════════════════════════════════
                        .requestMatchers("/uploads/**", "/api/uploads/**", "/profiles/**", "/api/profiles/**").permitAll()
                        .requestMatchers("/uploads/patients/**", "/uploads/doctors/**", "/uploads/staff/**").permitAll()

                        // ════════════════════════════════════════════
                        // LABORATOIRE - RÈGLES ORDONNÉES (du plus spécifique au plus général)
                        // ════════════════════════════════════════════
                        
                        // 1. Exceptions Docteurs (plus spécifique)
                        .requestMatchers("/api/lab-tests/doctor-results")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR")
                        
                        .requestMatchers("/api/lab-tests/doctor-alerts/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR")
                        
                        // ✅ NOUVEAU : Endpoint pour les résultats groupés par consultation
                        .requestMatchers("/api/lab-tests/doctor/consultations")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR")
                        
                        // ✅ NOUVEAU : Endpoint pour finaliser consultation
                        .requestMatchers("/api/v1/consultations/*/finaliser")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR")
                        
                        // 2. Exceptions Public/Initial
                        .requestMatchers("/api/lab-tests/available-doctors", "/api/lab-tests/send-to-doctor")
                        .permitAll()
                        
                        // 3. Exceptions Finance
                        .requestMatchers(HttpMethod.POST, "/api/lab-tests/queue")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_FINANCE", "ROLE_CAISSIER")
                        
                        // 4. Règle Générale (Catch-all) - doit être à la fin
                        .requestMatchers("/api/lab-tests/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_LABORATOIRE")

                        // ════════════════════════════════════════════
                        // PHARMACY - RÈGLES DE SÉCURITÉ
                        // ════════════════════════════════════════════
                        .requestMatchers("/api/pharmacy/**", "/api/v1/pharmacy/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_PHARMACIE", "ROLE_PHARMACY", "ROLE_PHARMACIST")
                        
                        // ════════════════════════════════════════════
                        // MEDICATIONS - INVENTAIRE ET GESTION (PLUS SPÉCIFIQUE EN PREMIER)
                        // ════════════════════════════════════════════
                        .requestMatchers(HttpMethod.GET, "/api/medications/inventory", "/api/v1/medications/inventory")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_PHARMACIE", "ROLE_PHARMACY", "ROLE_PHARMACIST", "ROLE_DOCTEUR")
                        .requestMatchers(HttpMethod.POST, "/api/medications/inventory/add", "/api/v1/medications/inventory/add")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_PHARMACIE", "ROLE_PHARMACY", "ROLE_PHARMACIST")
                        .requestMatchers(HttpMethod.PUT, "/api/medications/inventory/*", "/api/v1/medications/inventory/*")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_PHARMACIE", "ROLE_PHARMACY", "ROLE_PHARMACIST")
                        .requestMatchers(HttpMethod.DELETE, "/api/medications/inventory/*", "/api/v1/medications/inventory/*")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_PHARMACIE", "ROLE_PHARMACY", "ROLE_PHARMACIST")
                        
                        // Règle générale pour medications (catch-all)
                        .requestMatchers("/api/medications/**", "/api/v1/medications/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_PHARMACIE", "ROLE_PHARMACY", "ROLE_PHARMACIST")

                        // ════════════════════════════════════════════
                        // PRESCRIPTIONS - RÈGLES DE SÉCURITÉ
                        // ════════════════════════════════════════════
                        .requestMatchers("/api/prescriptions/**", "/api/v1/prescriptions/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR", "ROLE_PHARMACIE")

                        // ════════════════════════════════════════════
                        // TOUTES AUTRES REQUÊTES NON SPÉCIFIÉES CI-DESSUS DOIVENT ÊTRE AUTHENTIFIÉES
                        // ════════════════════════════════════════════
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOriginPatterns(Arrays.asList(
                "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
                "http://localhost:5176", "http://localhost:5177", "http://localhost:5178",
                "http://localhost:5180",
                "http://127.0.0.1:5173",
                "http://localhost:5179",
                "http://localhost:5181",
                "http://192.168.1.*", "http://10.*",
                "https://inuaafia.onrender.com",
                "https://inua-oux2.onrender.com",
                "*" // Allow all origins for WebSocket compatibility
        ));

        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin"));
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring()
                .requestMatchers("/ws-hospital/**")
                .requestMatchers("/ws-notifications/**")
                .requestMatchers("/ws-hospital/info/**")
                .requestMatchers("/ws-notifications/info/**")
                .requestMatchers("/health");
    }
}