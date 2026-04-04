package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Data Transfer Object pour les utilisateurs (Personnel et Patients).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {

    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String nom; // Ajout pour compatibilité frontend
    private String prenom; // Ajout pour compatibilité frontend
    private String phoneNumber;
    private String photoUrl;

    // ✅ CHAMPS SYNCHRONISÉS AVEC L'ENTITÉ USER
    private String bloodType;
    private String address;
    private String dateOfBirth;

    /**
     * ✅ CHAMP DÉPARTEMENT : Pour l'organisation hospitalière
     */
    private String department;

    /**
     * ✅ CORRECTION : Ajout de roleName pour matcher le UserServiceImpl.
     * Le champ 'role' est conservé pour la compatibilité descendante.
     */
    private String role;     // (ex: "ROLE_DOCTEUR")
    private String roleName; // (ex: "DOCTEUR")

    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Helper pour obtenir le nom complet facilement dans le Frontend
     */
    public String getFullName() {
        return (firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "");
    }
}