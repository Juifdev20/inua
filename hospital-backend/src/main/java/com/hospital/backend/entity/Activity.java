package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activities")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Activity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String action;      // ex: "Nouvel utilisateur créé"
    private String utilisateur; // l'admin qui a fait l'action
    private String details;     // ex: "Docteur Jean a été ajouté"
    private String type;        // success, info, warning, error (pour la couleur)

    private LocalDateTime date;

    @PrePersist
    protected void onCreate() {
        this.date = LocalDateTime.now();
    }
}