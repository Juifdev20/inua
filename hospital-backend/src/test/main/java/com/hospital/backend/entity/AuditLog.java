package com.hospital.backend.entity; // <--- AJOUTE CECI

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String action;
    private String utilisateur;
    private String cible;
    private String details;
    private String type;
    private String ip;
    private LocalDateTime date;
}