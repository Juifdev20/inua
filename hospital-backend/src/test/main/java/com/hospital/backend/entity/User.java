package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @JsonIgnore
    @Column(nullable = false, columnDefinition = "TEXT") // TEXT pour éviter les problèmes de hash longs
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

    // ✅ CHANGEMENT ICI : Utilisation de TEXT pour accepter les longues URLs de photos ou Base64
    @Column(name = "photo_url", columnDefinition = "TEXT")
    @JsonProperty("photoUrl")
    private String photoUrl;

    @Column(name = "blood_type")
    @JsonProperty("bloodType")
    private String bloodType;

    // ✅ CHANGEMENT ICI : Utilisation de TEXT pour les adresses détaillées
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

    @Column(name = "is_active")
    @JsonProperty("isActive")
    private Boolean isActive;

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