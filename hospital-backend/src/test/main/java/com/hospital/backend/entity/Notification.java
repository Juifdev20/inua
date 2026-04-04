package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title; // Ex: "Rendez-vous confirmé"

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message; // Ex: "Votre RDV avec le Dr. Smith est prévu pour demain."

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type; // RENDEZ_VOUS, DOCUMENT, PAIEMENT, etc.

    @Column(name = "is_read")
    private boolean isRead = false;

    /**
     * ID de référence pour la redirection (Style Facebook)
     * Permet de stocker l'ID du rendez-vous, du document, etc.
     */
    @Column(name = "reference_id")
    private Long referenceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Le destinataire

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}