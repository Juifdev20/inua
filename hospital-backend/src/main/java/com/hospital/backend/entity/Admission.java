package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "admissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Admission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private User doctor;

    @Column(name = "admission_date")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime admissionDate;

    // --- SIGNES VITAUX (TRIAGE) ---
    @Column(name = "poids")
    private String poids;

    @Column(name = "temperature")
    private String temperature;

    @Column(name = "taille")
    private String taille;

    @Column(name = "tension_arterielle")
    private String tensionArterielle;

    @Column(name = "reason_for_visit", columnDefinition = "TEXT")
    private String reasonForVisit; // motif

    @Column(name = "symptoms", columnDefinition = "TEXT")
    private String symptoms;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // ✅ Frais de dossier (registration fee) - payé une seule fois
    @Column(name = "registration_fee", precision = 19, scale = 2)
    @Builder.Default
    private java.math.BigDecimal registrationFee = java.math.BigDecimal.ZERO;

    // ✅ Frais de service/consultation
    @Column(name = "service_fee", precision = 19, scale = 2)
    @Builder.Default
    private java.math.BigDecimal serviceFee = java.math.BigDecimal.ZERO;

    // ✅ Montant total (registration_fee + service_fee)
    @Column(name = "total_amount", precision = 19, scale = 2)
    @Builder.Default
    private java.math.BigDecimal totalAmount = java.math.BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    private AdmissionStatus status;

    @Column(name = "amount_paid", precision = 19, scale = 2)
    @Builder.Default
    private java.math.BigDecimal amountPaid = java.math.BigDecimal.ZERO;

    @Column(name = "payment_method")
    private String paymentMethod;

    // --- ABONNÉS (Slice 1 - module entreprises) ---
    @Builder.Default
    @Column(name = "is_abonne", nullable = false)
    private Boolean isAbonne = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(name = "matricule", length = 80)
    private String matricule;

    /** Nom du travailleur / responsable (l'employé dont l'entreprise paie). */
    @Column(name = "subscriber_name", length = 200)
    private String subscriberName;

    /** Nom du bénéficiaire (la personne réellement soignée, peut être différente du travailleur). */
    @Column(name = "beneficiary_name", length = 200)
    private String beneficiaryName;

    /** Taux de couverture copié depuis l'entreprise au moment de l'admission (pour historique). */
    @Column(name = "coverage_rate", precision = 5, scale = 2)
    private java.math.BigDecimal coverageRate;

    /** Montant couvert par l'entreprise (pour facturation mensuelle). */
    @Column(name = "company_coverage", precision = 19, scale = 2)
    @Builder.Default
    private java.math.BigDecimal companyCoverage = java.math.BigDecimal.ZERO;

    /** Ticket modeste / surplus à charge du patient. */
    @Column(name = "patient_surplus", precision = 19, scale = 2)
    @Builder.Default
    private java.math.BigDecimal patientSurplus = java.math.BigDecimal.ZERO;

    @Column(name = "created_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum AdmissionStatus {
        EN_ATTENTE,
        EN_COURS,
        TERMINE,
        ANNULE
    }
}
