package com.hospital.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // /topic pour les messages publics, /queue pour les messages privés
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        // Pour envoyer des messages à un utilisateur spécifique (ex: /user/queue/notifications)
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Utilisation de setAllowedOriginPatterns pour une meilleure compatibilité CORS avec SockJS
        registry.addEndpoint("/ws-hospital")
                .setAllowedOriginPatterns(
                        "https://inua-oux2.onrender.com",
                        "https://inuaafia.onrender.com",
                        "http://localhost:5173",
                        "http://localhost:3000"
                )
                .withSockJS();

        registry.addEndpoint("/ws-notifications")
                .setAllowedOriginPatterns(
                        "https://inua-oux2.onrender.com",
                        "https://inuaafia.onrender.com",
                        "http://localhost:5173",
                        "http://localhost:3000"
                )
                .withSockJS();
    }
}