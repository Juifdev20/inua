package com.hospital.backend.config;

import com.hospital.backend.security.CustomUserDetailsService;
import com.hospital.backend.security.JwtAuthenticationFilter;
import com.hospital.backend.security.OAuth2AuthenticationFailureHandler;
import com.hospital.backend.security.OAuth2LoginSuccessHandler;
import com.hospital.backend.service.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
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
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.Collections;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomUserDetailsService userDetailsService;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
    private final OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler;
    private final OAuth2AuthorizationRequestResolver oAuth2AuthorizationRequestResolver;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        // Autorisations critiques pour CORS et WebSockets
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/ws-hospital/**", "/ws-notifications/**").permitAll()
                        .requestMatchers("/api/ws-hospital/**", "/api/ws-notifications/**").permitAll()
                        .requestMatchers("/health").permitAll()

                        // PRIORITÉ ABSOLUE : /me pour patient connecté (AVANT toutes autres règles patients)
                        .requestMatchers("/api/v1/patients/me", "/api/patients/me", "/v1/patients/me", "/patients/me")
                        .hasAnyAuthority("ROLE_PATIENT", "ROLE_ADMIN", "ROLE_DOCTEUR", "ROLE_RECEPTION")

                        // Auth et Uploads
                        .requestMatchers("/api/auth/**", "/auth/**", "/api/v1/auth/**").permitAll()
                        // ★ OAuth2 endpoints - Authentification sociale (Google, Facebook)
                        .requestMatchers("/oauth2/**", "/login/oauth2/**", "/api/oauth2/**").permitAll()
                        // Password change endpoints - accessible à tous les utilisateurs authentifiés
                        .requestMatchers("/api/password/**").authenticated()
                        .requestMatchers("/uploads/**", "/profiles/**", "/api/uploads/**", "/api/profiles/**").permitAll()
                        .requestMatchers("/uploads/patients/**", "/uploads/doctors/**", "/uploads/staff/**").permitAll()
                        // 🔧 Fichiers justificatifs pharmacie - temporairement public pour test
                        .requestMatchers("/api/files/justificatifs-pharmacie/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()

                        // Consultations
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/consultations/**", "/api/consultations/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_PATIENT")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/consultations/*/accept-reschedule").hasAuthority("ROLE_PATIENT")
                        .requestMatchers("/api/v1/consultations/*/decision", "/api/v1/consultations/*/start").hasAuthority("ROLE_DOCTEUR")
                        .requestMatchers("/api/v1/consultations/book", "/api/consultations/book").hasAnyAuthority("ROLE_PATIENT", "ROLE_ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/consultations/**", "/api/consultations/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR", "ROLE_PATIENT", "ROLE_RECEPTION")

                        // 🔧 Catalogue des services - accessible publiquement (sans authentification)
                        .requestMatchers("/api/v1/patient/services-catalog/**", "/api/patient/services-catalog/**")
                        .permitAll()

                        // Patient (singulier) - Routes de facturation et profil patient
                        .requestMatchers("/api/v1/patient/**", "/api/patient/**")
                        .hasAnyAuthority("ROLE_PATIENT", "ROLE_ADMIN", "ROLE_DOCTEUR", "ROLE_RECEPTION")

                        // Patients - Autres routes spécifiques
                        .requestMatchers("/api/v1/patients/all", "/api/patients/all", "/api/v1/patients/count")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_DOCTEUR")
                        .requestMatchers("/api/v1/patients/all", "/api/patients/all", "/api/v1/patients/count")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_DOCTEUR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/patients/*/deactivate")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION")
                        .requestMatchers("/api/v1/patients/**", "/api/patients/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_PATIENT", "ROLE_DOCTEUR")

                        // Docteurs et Profils
                        .requestMatchers(HttpMethod.POST, "/api/v1/doctors/documents/upload").hasAuthority("ROLE_DOCTEUR")
                        .requestMatchers(HttpMethod.GET, "/api/v1/doctors/all").hasAnyAuthority("ROLE_PATIENT", "ROLE_ADMIN", "ROLE_RECEPTION")
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/doctors")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_FINANCE", "ROLE_CAISSIER")
                        .requestMatchers("/api/v1/users/profile", "/api/admin/update-profile/**").authenticated()
                        .requestMatchers("/api/v1/doctor/**", "/api/doctor/**", "/api/v1/doctors/**", "/api/doctors/**").hasAuthority("ROLE_DOCTEUR")

                        // Finance et Pharmacie
                        .requestMatchers("/api/finance/prescription/**", "/api/v1/finance/prescription/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_FINANCE", "ROLE_CAISSIER", "ROLE_PHARMACIE", "ROLE_PHARMACIST")
                        .requestMatchers("/api/finance/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_FINANCE", "ROLE_CAISSIER", "ROLE_PHARMACIE", "ROLE_PHARMACIST", "ROLE_RECEPTION")
                        .requestMatchers("/api/finance/prescription/test").permitAll()

                        // Admin et Divers
                        .requestMatchers("/api/v1/admin/**", "/api/v1/audit/**", "/api/audit/**").hasAuthority("ROLE_ADMIN")
                        .requestMatchers("/api/v1/admissions/**", "/api/admissions/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_DOCTEUR", "ROLE_FINANCE", "ROLE_CAISSIER")
                        .requestMatchers("/api/v1/reception/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_FINANCE", "ROLE_CAISSIER")
                        .requestMatchers("/api/v1/documents/**", "/api/documents/**")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_DOCTEUR")

                        // Lab Tests
                        .requestMatchers("/api/lab-tests/doctor-results", "/api/lab-tests/doctor-alerts/**", "/api/lab-tests/doctor/consultations")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR")

                        // AI Chat
                        .requestMatchers("/api/ai/**").hasAnyAuthority("ROLE_PATIENT", "ROLE_ADMIN")

                        // Account Creation
                        .requestMatchers("/api/account-creation/staff").hasAuthority("ROLE_ADMIN")
                        .requestMatchers("/api/account-creation/**").authenticated()

                        .anyRequest().authenticated()
                )
                // ★ Configuration OAuth2 pour Social Login (Google, Facebook)
                .oauth2Login(oauth2 -> oauth2
                        .authorizationEndpoint(authorization ->
                                authorization.authorizationRequestResolver(oAuth2AuthorizationRequestResolver)
                        )
                        .userInfoEndpoint(userInfo ->
                                userInfo.userService(customOAuth2UserService)
                        )
                        .successHandler(oAuth2LoginSuccessHandler)
                        .failureHandler(oAuth2AuthenticationFailureHandler)
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Origines autorisees - URLs Render specifiques
        configuration.setAllowedOriginPatterns(Arrays.asList(
                "https://inua-oux2.onrender.com",
                "https://inuaafia.onrender.com",
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:8080",
                "http://127.0.0.1:5173"
        ));

        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Total-Count"));
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
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(Arrays.asList(
                "https://inua-oux2.onrender.com",
                "https://inuaafia.onrender.com",
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:8080",
                "http://127.0.0.1:5173"
        ));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setExposedHeaders(Arrays.asList("Authorization", "Content-Type"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring()
                .requestMatchers("/ws-hospital/**", "/ws-notifications/**")
                .requestMatchers("/api/ws-hospital/**", "/api/ws-notifications/**");
    }
}
