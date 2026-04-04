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

    // ✅ NOUVEAU: Montant total des examens/traitements
    @Column(name = "total_amount", precision = 19, scale = 2)
    private java.math.BigDecimal totalAmount = java.math.BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    private AdmissionStatus status;

    @Column(name = "amount_paid", precision = 19, scale = 2)
    private java.math.BigDecimal amountPaid = java.math.BigDecimal.ZERO;

    @Column(name = "payment_method")
    private String paymentMethod;

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
