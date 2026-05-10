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
        // Canal pour envoyer des messages du serveur vers le client (Broadcast)
        config.enableSimpleBroker("/topic");

        // Préfixe pour les messages envoyés du client vers le serveur (@MessageMapping)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint pour la Sidebar ou autres composants
        registry.addEndpoint("/ws-hospital")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        // 💡 CORRECTIF : Ajout de l'endpoint utilisé par PatientHeader.jsx
        // Cela règle l'erreur 500 "No static resource ws-notifications/info"
        registry.addEndpoint("/ws-notifications")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}