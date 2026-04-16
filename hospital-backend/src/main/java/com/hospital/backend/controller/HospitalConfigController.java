package com.hospital.backend.controller;

import com.hospital.backend.dto.HospitalConfigDTO;
import com.hospital.backend.entity.HospitalConfig;
import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.security.CustomUserDetails;
import com.hospital.backend.service.HospitalConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/hospital-config")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Configuration Hôpital", description = "Gestion des paramètres de l'hôpital")
@SecurityRequirement(name = "bearerAuth")
public class HospitalConfigController {

    private final HospitalConfigService configService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION', 'ROLE_FINANCE', 'ROLE_PHARMACIE', 'ROLE_LABORATOIRE')")
    @Operation(summary = "Récupérer la configuration de l'hôpital")
    public ResponseEntity<ApiResponse<HospitalConfigDTO>> getConfig() {
        HospitalConfig config = configService.getCurrentConfig()
                .orElseGet(configService::initializeDefault);
        return ResponseEntity.ok(ApiResponse.success(toDTO(config)));
    }

    @PutMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Mettre à jour la configuration de l'hôpital (Admin uniquement)")
    public ResponseEntity<ApiResponse<HospitalConfigDTO>> updateConfig(
            @Valid @RequestBody HospitalConfigDTO dto) {
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = getUserIdFromAuthentication(auth);
        
        HospitalConfig config = toEntity(dto);
        HospitalConfig saved = configService.saveOrUpdate(config, userId);
        
        return ResponseEntity.ok(ApiResponse.success("Configuration mise à jour avec succès", toDTO(saved)));
    }

    @PostMapping("/initialize")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Initialiser la configuration par défaut")
    public ResponseEntity<ApiResponse<HospitalConfigDTO>> initializeDefault() {
        HospitalConfig config = configService.initializeDefault();
        return ResponseEntity.ok(ApiResponse.success("Configuration initialisée", toDTO(config)));
    }

    // === MAPPERS ===
    private HospitalConfigDTO toDTO(HospitalConfig config) {
        return HospitalConfigDTO.builder()
                .id(config.getId())
                .hospitalName(config.getHospitalName())
                .hospitalCode(config.getHospitalCode())
                .hospitalLogoUrl(config.getHospitalLogoUrl())
                .ministryName(config.getMinistryName())
                .departmentName(config.getDepartmentName())
                .zoneName(config.getZoneName())
                .region(config.getRegion())
                .city(config.getCity())
                .country(config.getCountry())
                .phoneNumber(config.getPhoneNumber())
                .email(config.getEmail())
                .website(config.getWebsite())
                .address(config.getAddress())
                .postalCode(config.getPostalCode())
                .taxId(config.getTaxId())
                .registrationNumber(config.getRegistrationNumber())
                .licenseNumber(config.getLicenseNumber())
                .headerTitle(config.getHeaderTitle())
                .headerSubtitle(config.getHeaderSubtitle())
                .footerText(config.getFooterText())
                .documentWatermark(config.getDocumentWatermark())
                .primaryColor(config.getPrimaryColor())
                .secondaryColor(config.getSecondaryColor())
                .currencyCode(config.getCurrencyCode())
                .currencySymbol(config.getCurrencySymbol())
                .language(config.getLanguage())
                .timezone(config.getTimezone())
                .dateFormat(config.getDateFormat())
                .enableLogoOnDocuments(config.getEnableLogoOnDocuments())
                .enableWatermark(config.getEnableWatermark())
                .enableSignature(config.getEnableSignature())
                .fichePrice(config.getFichePrice())
                .updatedAt(config.getUpdatedAt())
                .updatedBy(config.getUpdatedBy())
                .build();
    }

    private HospitalConfig toEntity(HospitalConfigDTO dto) {
        return HospitalConfig.builder()
                .id(dto.getId())
                .hospitalName(dto.getHospitalName())
                .hospitalCode(dto.getHospitalCode())
                .hospitalLogoUrl(dto.getHospitalLogoUrl())
                .ministryName(dto.getMinistryName())
                .departmentName(dto.getDepartmentName())
                .zoneName(dto.getZoneName())
                .region(dto.getRegion())
                .city(dto.getCity())
                .country(dto.getCountry())
                .phoneNumber(dto.getPhoneNumber())
                .email(dto.getEmail())
                .website(dto.getWebsite())
                .address(dto.getAddress())
                .postalCode(dto.getPostalCode())
                .taxId(dto.getTaxId())
                .registrationNumber(dto.getRegistrationNumber())
                .licenseNumber(dto.getLicenseNumber())
                .headerTitle(dto.getHeaderTitle())
                .headerSubtitle(dto.getHeaderSubtitle())
                .footerText(dto.getFooterText())
                .documentWatermark(dto.getDocumentWatermark())
                .primaryColor(dto.getPrimaryColor())
                .secondaryColor(dto.getSecondaryColor())
                .currencyCode(dto.getCurrencyCode())
                .currencySymbol(dto.getCurrencySymbol())
                .language(dto.getLanguage())
                .timezone(dto.getTimezone())
                .dateFormat(dto.getDateFormat())
                .enableLogoOnDocuments(dto.getEnableLogoOnDocuments())
                .enableWatermark(dto.getEnableWatermark())
                .enableSignature(dto.getEnableSignature())
                .fichePrice(dto.getFichePrice() != null ? dto.getFichePrice() : new java.math.BigDecimal("5000"))
                .build();
    }

    private Long getUserIdFromAuthentication(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            return ((CustomUserDetails) auth.getPrincipal()).getUser().getId();
        }
        return null;
    }
}
