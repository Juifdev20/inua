package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "prescriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"consultation", "patient", "doctor", "items", "dispensedBy", "paidBy"})
@EqualsAndHashCode(exclude = {"consultation", "patient", "doctor", "items", "dispensedBy", "paidBy"})
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prescription_code", unique = true, nullable = false)
    private String prescriptionCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consultation_id", nullable = false)
    @JsonIgnoreProperties({"prescriptions", "labTests", "patient", "doctor"})
    private Consultation consultation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    @JsonIgnoreProperties({"consultations", "medicalRecords", "user", "createdBy"})
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    @JsonIgnoreProperties({"password", "role", "permissions", "patient"})
    private User doctor;

    @OneToMany(mappedBy = "prescription", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnoreProperties("prescription")
    private List<PrescriptionItem> items;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    private PrescriptionStatus status;

    // ✅ AJOUT: Champs financiers pour la caisse pharmacie
    @Column(name = "total_amount", precision = 19, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "amount_paid", precision = 19, scale = 2)
    private BigDecimal amountPaid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paid_by")
    @JsonIgnoreProperties({"password", "role", "permissions", "patient"})
    private User paidBy;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispensed_by")
    @JsonIgnoreProperties({"password", "role", "permissions", "patient"})
    private User dispensedBy;

    @Column(name = "dispensed_at")
    private LocalDateTime dispensedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (prescriptionCode == null) {
            prescriptionCode = "PRE-" + System.currentTimeMillis();
        }
        if (status == null) {
            status = PrescriptionStatus.EN_ATTENTE;
        }
        if (totalAmount == null) {
            totalAmount = BigDecimal.ZERO;
        }
        if (amountPaid == null) {
            amountPaid = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}