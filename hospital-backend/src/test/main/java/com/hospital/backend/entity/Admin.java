package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "admins")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Admin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String prenom;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    @JsonIgnore // Sécurité : Ne jamais envoyer le mot de passe haché au Frontend (React)
    private String password;

    private String telephone;

    private String role; // Exemple: "SUPER_ADMIN", "ADMIN"

    private String avatarUrl; // Pour stocker le chemin de la photo de profil

    @Column(name = "date_creation")
    private LocalDateTime dateCreation;

    @Column(name = "derniere_connexion")
    private LocalDateTime derniereConnexion;

    // Cette méthode s'exécute automatiquement avant l'insertion en base
    @PrePersist
    protected void onCreate() {
        dateCreation = LocalDateTime.now();
        if (role == null) role = "ADMIN";
    }
}