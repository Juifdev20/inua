package com.hospital.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.nio.file.Paths;
import java.io.File;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // ? CORRECTION: Utiliser un chemin absolu fixe pour les uploads
        // Le chemin doit pointer vers le dossier uploads dans le projet
        String projectRoot = System.getProperty("user.dir");
        
        // Si on est dans le dossier target (en mode run), remonter au dossier parent
        if (projectRoot.endsWith("target") || projectRoot.endsWith("target\\classes")) {
            projectRoot = projectRoot.replace("\\target\\classes", "").replace("/target/classes", "").replace("\\target", "").replace("/target", "");
        }
        
        String uploadPath = "file:///" + projectRoot.replace("\\", "/") + "/uploads/";
        
        // Ajouter aussi un chemin alternatif pour le développement
        String altUploadPath = "file:///c:/Users/dieud/Desktop/Inua/hospital-backend/uploads/";

        // Configuration pour servir les fichiers statiques (images, etc.)
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadPath, altUploadPath)
                .setCachePeriod(0) // Crucial pour voir les photos dès qu'elles sont créées
                .resourceChain(true);

        System.out.println("?? Serveur de ressources actif");
        System.out.println("?? Chemin physique principal : " + projectRoot + "/uploads/");
        System.out.println("?? URL d'accès : /uploads/nom_du_fichier.jpg");
    }
}
