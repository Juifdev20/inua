package com.hospital.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.hospital.backend.entity.Gender;
import jakarta.validation.constraints.Email;
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
@JsonIgnoreProperties(ignoreUnknown = true)
public class PatientDTO {

    private Long id;
    private String patientCode;
    private String firstName;
    private String lastName;
    private LocalDate dateOfBirth;
    private String birthPlace;
    private Gender gender;
    private String phoneNumber;

    @Email(message = "Format email invalide")
    private String email;

    private String profession;
    private String maritalStatus;
    private String religion;
    private String nationality;
    private String address;
    private String city;
    private String bloodType;
    private String emergencyContact;
    private String emergencyPhone;
    private String photoUrl;
    private String allergies;
    private String chronicDiseases;

    // ✅ Signes Vitaux (Triage)
    private Double weight;
    private Integer height;
    private String bloodPressure;
    private Double temperature;
    private Integer heartRate;
    private String symptoms;

    private String insuranceNumber;
    private String insuranceProvider;

    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Long consultationCount;
    private Long documentCount;
    private Long appointmentCount;

    private Boolean hasMedicalRecord;

    // ✅ CORRECTION CRUCIALE : On empêche Spring d'essayer de désérialiser ces listes
    // lors d'un envoi Multipart/Form-Data depuis le frontend.
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private List<MedicalRecordDTO> medicalRecords;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private List<ConsultationDTO> consultations;
}