package com.hospital.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("Hospital Management System (INUA)")
                        .version("1.0.0")
                        .description("""
                    API REST pour le système de gestion hospitalier multi-plateforme.
                    
                    ## Authentification
                    L'API utilise JWT (JSON Web Token) pour l'authentification.
                    
                    ### Obtenir un token
                    1. Faire une requête POST sur `/auth/login` avec les credentials
                    2. Récupérer le `accessToken` de la réponse
                    3. Utiliser ce token dans le header `Authorization: Bearer <token>`
                    
                    ## Rôles disponibles
                    - **ADMIN** : Accès complet
                    - **RECEPTION** : Gestion des patients et accueil
                    - **DOCTEUR** : Consultations et prescriptions
                    - **CONSULTANT** : Consultations (lecture)
                    - **LABORATOIRE** : Tests de laboratoire
                    - **PHARMACIE** : Ordonnances et médicaments
                    - **FINANCE** : Facturation
                    - **RH** : Gestion du personnel
                    - **PATIENT** : Accès patient
                    """)
                        .contact(new Contact()
                                .name("Support Technique")
                                .email("support@hospital.com"))
                        .license(new License()
                                .name("Licence Privée")
                                .url("https://hospital.com/license")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Entrez votre token JWT")
                        ));
    }
}
