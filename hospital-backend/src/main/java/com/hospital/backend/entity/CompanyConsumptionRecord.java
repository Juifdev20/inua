package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Enregistrement de consommation d'un patient abonné pour une entreprise.
 * Un enregistrement est créé après chaque flux : CONSULTATION, LABO, PHARMACIE.
 */
@Entity
@Table(name = "company_consumption_records", indexes = {
        @Index(name = "idx_ccr_company_date", columnList = "company_id,consumed_at"),
        @Index(name = "idx_ccr_patient",      columnList = "patient_id"),
        @Index(name = "idx_ccr_admission",    columnList = "admission_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyConsumptionRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admission_id")
    private Admission admission;

    @Column(name = "matricule", length = 80)
    private String matricule;

    /** Type de flux : CONSULTATION, LABO, PHARMACIE */
    @Enumerated(EnumType.STRING)
    @Column(name = "flux_type", nullable = false, length = 30)
    private FluxType fluxType;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "total_amount", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "company_coverage", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal companyCoverage = BigDecimal.ZERO;

    @Column(name = "patient_surplus", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal patientSurplus = BigDecimal.ZERO;

    @Column(name = "coverage_rate", precision = 5, scale = 2)
    private BigDecimal coverageRate;

    @Column(name = "consumed_at", nullable = false)
    private LocalDateTime consumedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.consumedAt == null) this.consumedAt = LocalDateTime.now();
    }

    public enum FluxType {
        CONSULTATION,
        LABO,
        PHARMACIE
    }
}
