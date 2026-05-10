package com.hospital.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.util.function.Consumer;

/**
 * ★ CONFIGURATION OAUTH2 AVANCÉE
 * Force l'affichage du sélecteur de compte Google/Facebook
 */
@Configuration
public class OAuth2Config {

    private static final String AUTHORIZATION_BASE_URI = "/oauth2/authorization";

    /**
     * Custom OAuth2AuthorizationRequestResolver that forces Google to show account selector
     */
    @Bean
    public OAuth2AuthorizationRequestResolver oAuth2AuthorizationRequestResolver(
            ClientRegistrationRepository clientRegistrationRepository) {

        DefaultOAuth2AuthorizationRequestResolver defaultResolver =
                new DefaultOAuth2AuthorizationRequestResolver(clientRegistrationRepository, AUTHORIZATION_BASE_URI);

        defaultResolver.setAuthorizationRequestCustomizer(authorizationRequestCustomizer());

        return defaultResolver;
    }

    /**
     * Customizer that adds prompt=select_account for Google OAuth2
     */
    private Consumer<OAuth2AuthorizationRequest.Builder> authorizationRequestCustomizer() {
        return builder -> {
            builder.additionalParameters(params -> {
                params.put("prompt", "select_account");
            });
        };
    }
}
