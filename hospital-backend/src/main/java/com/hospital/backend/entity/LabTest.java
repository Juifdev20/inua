package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "lab_tests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"consultation", "patient", "requestedBy", "processedBy", "doctorRecipient"})
@EqualsAndHashCode(exclude = {"consultation", "patient", "requestedBy", "processedBy", "doctorRecipient"})
public class LabTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "test_code", unique = true, nullable = false, length = 50)
    private String testCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consultation_id", nullable = false)
    @JsonIgnoreProperties({"labTests", "prescriptions", "patient", "doctor"})
    private Consultation consultation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    @JsonIgnoreProperties({"consultations", "medicalRecords", "user", "createdBy"})
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by")
    @JsonIgnoreProperties({"password", "role", "permissions", "patient"})
    private User requestedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by")
    @JsonIgnoreProperties({"password", "role", "permissions", "patient"})
    private User processedBy;

    // ✅ NOUVEAU : Le docteur qui doit recevoir les résultats
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    @JsonIgnoreProperties({"password", "role", "permissions", "patient"})
    private User doctorRecipient;

    @Column(name = "test_type", nullable = false)
    private String testType;

    @Column(name = "test_name", nullable = false)
    private String testName;

    @Column(columnDefinition = "TEXT")
    private String description;

    // ✅ MODIFICATION : Ce champ contiendra le JSON des valeurs saisies dans le frontend
    @Column(columnDefinition = "TEXT")
    private String results;

    @Column(columnDefinition = "TEXT")
    private String interpretation;

    @Column(name = "normal_range")
    private String normalRange;

    @Column(length = 20)
    private String unit;

    @Enumerated(EnumType.STRING)
    private LabTestStatus status;

    @Column(name = "priority")
    @Enumerated(EnumType.STRING)
    private Priority priority;

    @Column(name = "requested_at")
    private LocalDateTime requestedAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "from_finance")
    private boolean fromFinance = false;

    @Builder.Default
    @Column(name = "unit_price", precision = 19, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;

        if (requestedAt == null) {
            requestedAt = now;
        }

        // Génération automatique du code si absent
        if (this.testCode == null || this.testCode.isEmpty()) {
            this.testCode = generateUniqueTestCode();
        }

        // Statut par défaut à la création
        if (this.status == null) {
            this.status = LabTestStatus.EN_ATTENTE;
        }

        if (this.priority == null) {
            this.priority = Priority.NORMALE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Génère un code unique pour le test
     * Format: LAB-Timestamp-Random
     */
    private String generateUniqueTestCode() {
        long timestamp = System.currentTimeMillis();
        int randomSuffix = (int) (Math.random() * 10000);
        return String.format("LAB-%d-%04d", timestamp, randomSuffix);
    }
}