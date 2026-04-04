package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "patients")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"medicalRecords", "consultations", "createdBy", "user"})
@EqualsAndHashCode(exclude = {"medicalRecords", "consultations", "createdBy", "user"})
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "patient"})
    private User user;

    @Column(name = "patient_code", unique = true, nullable = false)
    private String patientCode;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "birth_place")
    private String birthPlace;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "email", unique = true, nullable = true)
    private String email;

    @Column(name = "profession")
    private String profession;

    @Column(name = "marital_status")
    private String maritalStatus;

    @Column(name = "religion")
    private String religion;

    @Column(name = "nationality")
    private String nationality;

    @Column(name = "health_area")
    private String healthArea;

    @Column(columnDefinition = "TEXT")
    private String address;

    private String city;

    @Column(name = "blood_type")
    private String bloodType;

    @Column(name = "emergency_contact")
    private String emergencyContact;

    @Column(name = "emergency_phone")
    private String emergencyPhone;

    @Column(name = "photo_url", columnDefinition = "TEXT")
    private String photoUrl;

    @Column(columnDefinition = "TEXT")
    private String allergies;

    @Column(name = "chronic_diseases", columnDefinition = "TEXT")
    private String chronicDiseases;

    // --- ✅ AJOUT : Champs de Triage (Signes Vitaux) ---
    // Ces champs sont indispensables pour valider l'admission
    @Column(name = "weight")
    private Double weight;

    @Column(name = "height")
    private Integer height;

    @Column(name = "blood_pressure")
    private String bloodPressure;

    @Column(name = "temperature")
    private Double temperature;

    @Column(name = "heart_rate")
    private Integer heartRate;

    @Column(name = "symptoms", columnDefinition = "TEXT")
    private String symptoms;

    // --- Assurance ---
    @Column(name = "insurance_number")
    private String insuranceNumber;

    @Column(name = "insurance_provider")
    private String insuranceProvider;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @JsonIgnoreProperties("patient")
    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<MedicalRecord> medicalRecords;

    @JsonIgnoreProperties("patient")
    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<Consultation> consultations;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "patient"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (patientCode == null) {
            patientCode = "PAT-" + System.currentTimeMillis();
        }
        if (email != null && email.trim().isEmpty()) {
            email = null;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (email != null && email.trim().isEmpty()) {
            email = null;
        }
    }
}