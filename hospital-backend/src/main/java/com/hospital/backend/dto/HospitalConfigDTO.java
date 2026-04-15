package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HospitalConfigDTO {
    
    private Long id;
    
    // === INFORMATIONS PRINCIPALES ===
    private String hospitalName;
    private String hospitalCode;
    private String hospitalLogoUrl;
    
    // === INFORMATIONS ADMINISTRATIVES ===
    private String ministryName;
    private String departmentName;
    private String zoneName;
    private String region;
    private String city;
    private String country;
    
    // === CONTACTS ===
    private String phoneNumber;
    private String email;
    private String website;
    private String address;
    private String postalCode;
    
    // === INFORMATIONS LÉGALES ===
    private String taxId;
    private String registrationNumber;
    private String licenseNumber;
    
    // === PERSONNALISATION DES FICHES ===
    private String headerTitle;
    private String headerSubtitle;
    private String footerText;
    private String documentWatermark;
    private String primaryColor;
    private String secondaryColor;
    
    // === CONFIGURATION SYSTÈME ===
    private String currencyCode;
    private String currencySymbol;
    private String language;
    private String timezone;
    private String dateFormat;
    private Boolean enableLogoOnDocuments;
    private Boolean enableWatermark;
    private Boolean enableSignature;
    
    // === MÉTADONNÉES ===
    private Long updatedBy;
    private LocalDateTime updatedAt;
}
