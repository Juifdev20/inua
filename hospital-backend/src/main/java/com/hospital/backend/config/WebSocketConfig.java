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
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-hospital")
                .setAllowedOrigins("https://inua-oux2.onrender.com", "https://inuaafia.onrender.com", "http://localhost:5173")
                .withSockJS();

        registry.addEndpoint("/ws-notifications")
                .setAllowedOrigins("https://inua-oux2.onrender.com", "https://inuaafia.onrender.com", "http://localhost:5173")
                .withSockJS();
    }
}
