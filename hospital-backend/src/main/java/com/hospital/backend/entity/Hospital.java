package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicUpdate;

import java.time.LocalDateTime;

@Entity
@Table(name = "hospitals")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@DynamicUpdate
public class Hospital {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "hospital_sequence")
    @SequenceGenerator(name = "hospital_sequence", sequenceName = "hospitals_id_seq", allocationSize = 1)
    private Long id;

    @Column(name = "nom", nullable = false)
    private String nom;

    @Column(name = "code", unique = true, nullable = false, length = 50)
    private String code;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "city")
    private String city;

    @Column(name = "country")
    private String country;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "email")
    private String email;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "subscription_plan", length = 50)
    @Builder.Default
    private String subscriptionPlan = "STANDARD";

    @Column(name = "max_users")
    @Builder.Default
    private Integer maxUsers = 100;

    @Column(name = "admin_email")
    private String adminEmail;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // ═══════════════════════════════════════════════════
    // INSCRIPTION PUBLIQUE / WORKFLOW D'APPROBATION
    // registrationStatus: APPROVED (défaut historique) | PENDING | REJECTED
    // NULL est traité comme APPROVED pour la compatibilité des lignes existantes.
    // ═══════════════════════════════════════════════════
    @Column(name = "registration_status", length = 20)
    @Builder.Default
    private String registrationStatus = "APPROVED";

    @Column(name = "requested_admin_first_name")
    private String requestedAdminFirstName;

    @Column(name = "requested_admin_last_name")
    private String requestedAdminLastName;

    @Column(name = "requested_admin_phone", length = 50)
    private String requestedAdminPhone;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    // ═══════════════════════════════════════════════════
    // ABONNEMENT
    // subscriptionStatus: TRIAL | ACTIVE | PENDING_PAYMENT | GRACE | EXPIRED
    // subscriptionType  : MONTHLY | ANNUAL
    // NULL de subscriptionStatus traité comme ACTIVE (hôpitaux historiques).
    // ═══════════════════════════════════════════════════
    @Column(name = "subscription_status", length = 20)
    private String subscriptionStatus;

    @Column(name = "subscription_type", length = 20)
    private String subscriptionType;

    @Column(name = "subscription_start")
    private java.time.LocalDate subscriptionStart;

    @Column(name = "subscription_end")
    private java.time.LocalDate subscriptionEnd;

    /** Anti-spam : mémorise le dernier palier d'alerte déjà envoyé (ex: "J-5", "EXPIRED"). */
    @Column(name = "last_subscription_alert", length = 20)
    private String lastSubscriptionAlert;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
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
}
