package com.hospital.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "app_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppConfig {

    @Id
    private Long id = 1L; // On force l'ID à 1 car il n'y a qu'une seule config

    private String appName;
    private String appDescription;
    private String timezone;
    private String language;
    private String logoUrl;
    private Integer sessionTimeout;
    private Boolean allowSelfRegistration;

    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}