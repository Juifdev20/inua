package com.hospital.backend.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * ★ GESTIONNAIRE D'ÉCHEC OAUTH2
 * Redirige vers le frontend après échec ou annulation de connexion sociale (Google/Facebook)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException, ServletException {

        log.warn("❌ [OAuth2] Échec de l'authentification: {}", exception.getMessage());

        // Redirection vers le frontend avec paramètre d'erreur
        String targetUrl = frontendUrl + "/login?error=oauth_cancelled";
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
