package com.hospital.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuration Web pour CORS et gestion des ressources statiques
 * Supporte localhost (dev) et URL Render (production)
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir:uploads/profiles}")
    private String uploadDir;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Désactivé car CORS est géré dans SecurityConfig.java
        // pour éviter les conflits de configuration
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Servir les fichiers uploads depuis le repertoire externe
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/")
                .setCachePeriod(3600);

        // Servir les images de profil
        registry.addResourceHandler("/profiles/**")
                .addResourceLocations("file:" + uploadDir + "/")
                .setCachePeriod(3600);
        
        // Servir les photos des patients
        registry.addResourceHandler("/uploads/patients/**")
                .addResourceLocations("file:uploads/patients/")
                .setCachePeriod(3600);
                
        // Servir les avatars
        registry.addResourceHandler("/uploads/avatars/**")
                .addResourceLocations("file:uploads/avatars/")
                .setCachePeriod(3600);
        
        // ✅ Servir les documents médicaux (medical_docs)
        registry.addResourceHandler("/medical_docs/**")
                .addResourceLocations("file:uploads/medical_docs/")
                .setCachePeriod(3600);
        
        // ✅ Servir les documents doctors
        registry.addResourceHandler("/doctors/docs/**")
                .addResourceLocations("file:uploads/doctors/")
                .setCachePeriod(3600);
    }
}