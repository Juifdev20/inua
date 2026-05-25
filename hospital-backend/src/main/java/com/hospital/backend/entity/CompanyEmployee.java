package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Agent (salarié ou dépendant) couvert par l'abonnement d'une entreprise.
 * Lié à un Patient existant dans le système.
 */
@Entity
@Table(name = "company_employees",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_company_patient", columnNames = {"company_id", "patient_id"})
        },
        indexes = {
                @Index(name = "idx_employee_company", columnList = "company_id"),
                @Index(name = "idx_employee_patient", columnList = "patient_id"),
                @Index(name = "idx_employee_matricule", columnList = "matricule")
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"company", "patient", "dependantOf"})
@EqualsAndHashCode(of = "id")
public class CompanyEmployee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "medicalRecords", "consultations", "user", "createdBy"})
    private Patient patient;

    @Column(name = "matricule", length = 80)
    private String matricule;

    /** Si non null, cet employé est dépendant d'un autre employé (conjoint, enfant). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dependant_of_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "company", "patient", "dependantOf"})
    private CompanyEmployee dependantOf;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at", updatable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.isActive == null) this.isActive = true;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
