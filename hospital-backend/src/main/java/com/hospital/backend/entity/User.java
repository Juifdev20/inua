package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicUpdate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@DynamicUpdate
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @JsonIgnore
    @Column(nullable = false, columnDefinition = "TEXT")
    private String password;

    @Column(name = "first_name", nullable = false)
    @JsonProperty("firstName")
    private String firstName;

    @Column(name = "last_name", nullable = false)
    @JsonProperty("lastName")
    private String lastName;

    @Column(name = "phone_number")
    @JsonProperty("phoneNumber")
    private String phoneNumber;

    @Column(name = "photo_url", columnDefinition = "TEXT")
    @JsonProperty("photoUrl")
    private String photoUrl;

    @Column(name = "blood_type")
    @JsonProperty("bloodType")
    private String bloodType;

    @Column(name = "address", columnDefinition = "TEXT")
    @JsonProperty("address")
    private String address;

    @Column(name = "date_of_birth")
    @JsonProperty("dateOfBirth")
    private String dateOfBirth;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id", referencedColumnName = "id")
    @JsonIgnoreProperties({"users", "utilisateurs"})
    private Department department;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false, referencedColumnName = "id")
    @JsonIgnoreProperties({"users", "utilisateursCount"})
    private Role role;

    // ✅ RELATION AVEC PATIENT (DÉJÀ AJOUTÉE)
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private Patient patient;

    // ✅ NOUVEL AJOUT : RELATION AVEC NOTIFICATIONS POUR ÉVITER L'ERREUR SQL 23503
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("user")
    private List<Notification> notifications;

    @Column(name = "is_active")
    @JsonProperty("isActive")
    private Boolean isActive;

    // ✅ NOUVEAUX CHAMPS POUR LES PRÉFÉRENCES DE NOTIFICATIONS
    @Column(name = "notification_enabled")
    @JsonProperty("notificationEnabled")
    private Boolean notificationEnabled = true;

    @Column(name = "sound_enabled")
    @JsonProperty("soundEnabled")
    private Boolean soundEnabled = true;

    @Column(name = "preferred_language", length = 10)
    @JsonProperty("preferredLanguage")
    private String preferredLanguage = "fr";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (this.isActive == null) {
            this.isActive = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}