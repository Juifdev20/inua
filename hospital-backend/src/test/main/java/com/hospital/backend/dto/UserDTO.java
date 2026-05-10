package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

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
    private String phoneNumber;
    private String photoUrl;

    // ✅ NOUVEAUX CHAMPS SYNCHRONISÉS AVEC L'ENTITÉ USER
    private String bloodType;
    private String address;
    private String dateOfBirth;

    /**
     * ✅ CHAMP CRUCIAL : Nom du département
     */
    private String department;

    private String role; // (ex: ADMIN, DOCTEUR, PATIENT)

    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}