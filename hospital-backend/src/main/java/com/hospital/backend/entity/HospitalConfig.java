package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicUpdate;
import java.time.LocalDateTime;

/**
 * Configuration globale de l'hôpital
 * Stocke les informations d'identité de l'établissement pour les fiches et documents
 */
@Entity
@Table(name = "hospital_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@DynamicUpdate
public class HospitalConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // === INFORMATIONS PRINCIPALES ===
    @Column(name = "hospital_name", nullable = false)
    private String hospitalName;

    @Column(name = "hospital_code", unique = true)
    private String hospitalCode;

    @Column(name = "hospital_logo_url", columnDefinition = "TEXT")
    private String hospitalLogoUrl;

    // === INFORMATIONS ADMINISTRATIVES ===
    @Column(name = "ministry_name")
    private String ministryName;

    @Column(name = "department_name")
    private String departmentName;

    @Column(name = "zone_name")
    private String zoneName;

    @Column(name = "region")
    private String region;

    @Column(name = "city")
    private String city;

    @Column(name = "country")
    private String country;

    // === CONTACTS ===
    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "email")
    private String email;

    @Column(name = "website")
    private String website;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "postal_code")
    private String postalCode;

    // === INFORMATIONS LÉGALES ===
    @Column(name = "tax_id")
    private String taxId;

    @Column(name = "registration_number")
    private String registrationNumber;

    @Column(name = "license_number")
    private String licenseNumber;

    // === PERSONNALISATION DES FICHES ===
    @Column(name = "header_title")
    private String headerTitle;

    @Column(name = "header_subtitle")
    private String headerSubtitle;

    @Column(name = "footer_text")
    private String footerText;

    @Column(name = "document_watermark")
    private String documentWatermark;

    @Column(name = "primary_color")
    private String primaryColor;

    @Column(name = "secondary_color")
    private String secondaryColor;

    // === CONFIGURATION SYSTÈME ===
    @Column(name = "currency_code", length = 3)
    private String currencyCode;

    @Column(name = "currency_symbol")
    private String currencySymbol;

    @Column(name = "language", length = 10)
    private String language;

    @Column(name = "timezone")
    private String timezone;

    @Column(name = "date_format")
    private String dateFormat;

    @Column(name = "enable_logo_on_documents")
    private Boolean enableLogoOnDocuments;

    @Column(name = "enable_watermark")
    private Boolean enableWatermark;

    @Column(name = "enable_signature")
    private Boolean enableSignature;

    // === CONFIGURATION FINANCIÈRE ===
    @Column(name = "fiche_price", precision = 19, scale = 2)
    @Builder.Default
    private java.math.BigDecimal fichePrice = new java.math.BigDecimal("5000");

    // === MÉTADONNÉES ===
    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.fichePrice == null) {
            this.fichePrice = new java.math.BigDecimal("5000");
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
