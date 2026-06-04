package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 📱 DeviceSession — Suivi des appareils connectés au système.
 * Permet au Super Admin de bloquer un appareil indépendamment du compte utilisateur.
 */
@Entity
@Table(name = "device_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String deviceId;        // Hash/fingerprint unique de l'appareil

    @Column(nullable = false)
    private Long userId;            // ID de l'utilisateur connecté

    @Column(columnDefinition = "TEXT")
    private String username;        // Nom d'utilisateur (pour affichage)

    @Column(columnDefinition = "TEXT")
    private String ipAddress;       // Adresse IP

    @Column(columnDefinition = "TEXT")
    private String userAgent;       // Navigateur / OS

    @Column(nullable = false)
    @Builder.Default
    private boolean blocked = false; // true = appareil bloqué

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime firstSeen = LocalDateTime.now();

    private LocalDateTime lastSeen;  // Dernière activité

    @Column(columnDefinition = "TEXT")
    private String blockReason;     // Raison du blocage (optionnel)
}
