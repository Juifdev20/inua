package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Réglages globaux d'abonnement, définis par le SUPER ADMIN.
 * Table à ligne unique (id = 1). Prix par plan, devise, essai, grâce, réduction annuelle.
 */
@Entity
@Table(name = "subscription_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionSettings {

    @Id
    private Long id;

    /** Devise des abonnements : "USD" ou "CDF". */
    @Column(name = "currency", length = 10)
    @Builder.Default
    private String currency = "USD";

    /** Prix mensuel par plan. L'annuel est calculé = mensuel * 12 * (1 - annualDiscountPercent/100). */
    @Column(name = "standard_monthly_price", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal standardMonthlyPrice = new BigDecimal("50");

    @Column(name = "premium_monthly_price", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal premiumMonthlyPrice = new BigDecimal("100");

    @Column(name = "enterprise_monthly_price", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal enterpriseMonthlyPrice = new BigDecimal("200");

    /** Réduction (%) appliquée sur l'abonnement annuel. */
    @Column(name = "annual_discount_percent", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal annualDiscountPercent = new BigDecimal("15");

    /** Nombre de jours d'essai gratuit à la création (0 = paiement immédiat requis). */
    @Column(name = "trial_days")
    @Builder.Default
    private Integer trialDays = 14;

    /** Jours de tolérance après échéance avant blocage des modules cliniques. */
    @Column(name = "grace_days")
    @Builder.Default
    private Integer graceDays = 3;

    /** Jours avant l'échéance où l'alerte de renouvellement est envoyée. */
    @Column(name = "alert_days_before")
    @Builder.Default
    private Integer alertDaysBefore = 5;

    /**
     * Automatisation complète (défaut). Si vrai : paiements auto-confirmés,
     * inscriptions avec essai auto-approuvées, admin provisionné et identifiants
     * envoyés automatiquement, sans intervention du Super Admin.
     * Si faux : le Super Admin valide manuellement (file de confirmation).
     */
    @Column(name = "auto_approve")
    @Builder.Default
    private Boolean autoApprove = true;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    @PrePersist
    protected void touch() {
        updatedAt = LocalDateTime.now();
    }
}
