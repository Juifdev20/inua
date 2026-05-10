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
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        // 1. Requêtes OPTIONS (Preflight CORS) - Toujours en premier
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // 2. Routes publiques (Auth, Swagger, Uploads, WebSockets)
                        .requestMatchers("/api/auth/**", "/auth/**", "/api/v1/auth/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers("/ws-hospital/**", "/ws-notifications/**").permitAll()

                        // 3. CONSULTATIONS : Précision des accès par méthode/action

                        // ✅ CORRECTION : Autoriser la suppression aux admins ET aux patients (pour annuler leur propre RDV)
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/consultations/**", "/api/consultations/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_PATIENT")

                        // ✅ NOUVEAU : Autoriser explicitement le patient à confirmer le report (Route PUT)
                        .requestMatchers(HttpMethod.PUT, "/api/v1/consultations/*/accept-reschedule").hasAuthority("ROLE_PATIENT")

                        // Bloquer les actions de décision/prise en charge aux docteurs uniquement
                        .requestMatchers("/api/v1/consultations/*/decision", "/api/v1/consultations/*/start").hasAuthority("ROLE_DOCTEUR")

                        // Autoriser le booking aux patients et admins
                        .requestMatchers("/api/v1/consultations/book", "/api/consultations/book").hasAnyAuthority("ROLE_PATIENT", "ROLE_ADMIN")

                        // Autoriser la lecture (GET) des fiches aux patients, docteurs et admins
                        .requestMatchers(HttpMethod.GET, "/api/v1/consultations/**", "/api/consultations/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR", "ROLE_PATIENT", "ROLE_RECEPTION")

                        // ✅ CORRECTION : Règle générale incluant ROLE_PATIENT pour les autres PUT autorisés
                        .requestMatchers("/api/v1/consultations/**", "/api/consultations/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR", "ROLE_RECEPTION", "ROLE_PATIENT")

                        // 4. PATIENTS
                        .requestMatchers("/api/v1/patients/me", "/api/patients/me").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/patients/**", "/api/patients/**").hasAnyAuthority("ROLE_PATIENT", "ROLE_ADMIN")
                        .requestMatchers("/api/v1/patients/**", "/api/patients/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION", "ROLE_PATIENT")

                        // 5. DOCTEURS & DÉPARTEMENTS
                        .requestMatchers("/api/v1/doctors/**", "/api/doctors/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_PATIENT", "ROLE_DOCTEUR")
                        .requestMatchers("/api/v1/departments/**", "/api/departments/**").permitAll()

                        // 6. NOTIFICATIONS
                        .requestMatchers("/api/notifications/**", "/api/v1/notifications/**").authenticated()

                        // 7. ADMINISTRATION & PROFILS
                        .requestMatchers("/api/v1/users/profile", "/api/users/profile").authenticated()
                        .requestMatchers("/api/admin/update-profile/**", "/api/admin/upload-photo/**").authenticated()
                        .requestMatchers("/api/v1/admin/**", "/api/admin/**").hasAuthority("ROLE_ADMIN")
                        .requestMatchers("/api/v1/users/**", "/api/users/**").hasAuthority("ROLE_ADMIN")
                        .requestMatchers("/api/v1/audit/**").hasAuthority("ROLE_ADMIN")

                        // 8. RÉCEPTION
                        .requestMatchers("/api/v1/reception/**", "/api/reception/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_RECEPTION")

                        // 9. Sécurité par défaut
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost:5173", "http://localhost:5174", "http://localhost:5175","http://localhost:5178",
                "http://localhost:5176", "http://localhost:5177", "http://localhost:5180",
                "http://127.0.0.1:5173", "http://127.0.0.1:5176", "http://10.60.171.219:5173"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With"));
        configuration.setAllowCredentials(true);

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
}