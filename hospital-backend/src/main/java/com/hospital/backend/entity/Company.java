package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entreprise abonnée à la clinique (gestion des patients couverts par contrat).
 */
@Entity
@Table(name = "companies", indexes = {
        @Index(name = "idx_company_status", columnList = "subscription_status"),
        @Index(name = "idx_company_name", columnList = "name")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "contact_person", length = 150)
    private String contactPerson;

    @Column(name = "contract_number", length = 100, unique = true)
    private String contractNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_status", nullable = false, length = 20)
    @Builder.Default
    private SubscriptionStatus subscriptionStatus = SubscriptionStatus.ACTIVE;

    /** Pourcentage de prise en charge (0-100). 100 = couverture totale. */
    @Column(name = "coverage_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal coverageRate = new BigDecimal("100.00");

    /** Surplus appliqué sur les soins pris ailleurs (en %). Défaut: 35%. */
    @Column(name = "surplus_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal surplusRate = new BigDecimal("35.00");

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
        if (this.subscriptionStatus == null) this.subscriptionStatus = SubscriptionStatus.ACTIVE;
        if (this.coverageRate == null) this.coverageRate = new BigDecimal("100.00");
        if (this.surplusRate == null) this.surplusRate = new BigDecimal("35.00");
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
