package com.hospital.backend.dto;

import com.hospital.backend.entity.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientDTO {

    // --- Informations de base ---
    private Long id;
    private String patientCode;

    @NotBlank(message = "Le prénom est obligatoire")
    private String firstName;

    @NotBlank(message = "Le nom est obligatoire")
    private String lastName;

    private LocalDate dateOfBirth;
    private Gender gender;
    private String phoneNumber;

    @Email(message = "Format email invalide")
    private String email;

    // --- Adresse et Localisation ---
    private String address;
    private String city;

    // --- Informations Médicales ---
    private String bloodType;
    private String emergencyContact;
    private String emergencyPhone;
    private String photoUrl;
    private String allergies;
    private String chronicDiseases;

    // --- Assurance ---
    private String insuranceNumber;
    private String insuranceProvider;

    // --- État du compte ---
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // --- NOUVEAU : Compteurs pour le Dashboard Patient ---
    // Ces champs permettent de remplir les cartes bleues (Stats) du Dashboard
    private Long consultationCount;
    private Long documentCount;
    private Long appointmentCount;

    // --- Dossier Médical Lié (Pour la vue Admin) ---
    private List<MedicalRecordDTO> medicalRecords;
    private List<ConsultationDTO> consultations;
}