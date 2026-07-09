package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Un paiement d'abonnement (simulation) pour un hôpital.
 * Alimente l'historique de facturation (page Billing) et la file de
 * confirmation du Super Admin.
 *
 * status  : PENDING | CONFIRMED | REJECTED
 * method  : VISA | MASTERCARD | MPESA | AIRTEL | BANK
 * period  : MONTHLY | ANNUAL
 */
@Entity
@Table(name = "subscription_payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "hospital_id", nullable = false)
    private Hospital hospital;

    /** Plan payé : STANDARD | PREMIUM | ENTERPRISE */
    @Column(name = "plan", length = 30)
    private String plan;

    /** Période : MONTHLY | ANNUAL */
    @Column(name = "period", length = 20)
    private String period;

    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", length = 10)
    private String currency;

    /** Moyen de paiement simulé : VISA | MASTERCARD | MPESA | AIRTEL | BANK */
    @Column(name = "method", length = 30)
    private String method;

    /** Statut : PENDING | CONFIRMED | REJECTED */
    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "PENDING";

    /** Référence de transaction (générée, unique). */
    @Column(name = "reference", length = 60, unique = true)
    private String reference;

    /** Nom/téléphone/carte masquée saisi dans le formulaire (traçabilité). */
    @Column(name = "payer_name")
    private String payerName;

    @Column(name = "payer_detail")
    private String payerDetail;

    /** Période d'abonnement couverte par ce paiement. */
    @Column(name = "period_start")
    private LocalDate periodStart;

    @Column(name = "period_end")
    private LocalDate periodEnd;

    @Column(name = "confirmed_by")
    private String confirmedBy;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "PENDING";
    }
}
