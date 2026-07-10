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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/hospital-config")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Configuration Hôpital", description = "Gestion des paramètres de l'hôpital")
@SecurityRequirement(name = "bearerAuth")
public class HospitalConfigController {

    private final HospitalConfigService configService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION', 'ROLE_FINANCE', 'ROLE_PHARMACIE', 'ROLE_LABORATOIRE', 'ROLE_PATIENT')")
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

        log.info("🔍 [CONFIG DEBUG] hospitalLogoUrl reçu: {}",
            dto.getHospitalLogoUrl() != null ? dto.getHospitalLogoUrl().substring(0, Math.min(60, dto.getHospitalLogoUrl().length())) : "NULL");

        // Convertir le logo base64 en fichier pour éviter de stocker de gros blob en DB
        if (dto.getHospitalLogoUrl() != null && dto.getHospitalLogoUrl().startsWith("data:image")) {
            try {
                String dataUrl = dto.getHospitalLogoUrl();
                String base64Data = dataUrl.substring(dataUrl.indexOf(",") + 1);
                byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Data);
                String ext = dataUrl.contains("jpeg") || dataUrl.contains("jpg") ? "jpg" : "png";
                String fileName = "hospital_logo_" + System.currentTimeMillis() + "." + ext;
                Path dir = Paths.get("uploads/logo/");
                Files.createDirectories(dir);
                Files.write(dir.resolve(fileName), imageBytes);
                String logoPath = "/uploads/logo/" + fileName;
                dto.setHospitalLogoUrl(logoPath);
                log.info("✅ Logo base64 converti en fichier: {}", logoPath);
            } catch (Exception e) {
                log.warn("⚠️ Impossible de convertir le logo base64 en fichier: {}", e.getMessage());
            }
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = getUserIdFromAuthentication(auth);
        
        // Récupérer la config existante pour préserver les champs non fournis
        HospitalConfig existingConfig = configService.getCurrentConfig().orElse(null);
        
        HospitalConfig config = toEntity(dto);
        
        // Préserver l'URL du logo existant si non fourni dans le DTO
        if (existingConfig != null && dto.getHospitalLogoUrl() == null) {
            config.setHospitalLogoUrl(existingConfig.getHospitalLogoUrl());
            log.info("🔍 [CONFIG DEBUG] Logo existant préservé: {}", existingConfig.getHospitalLogoUrl());
        }
        
        HospitalConfig saved = configService.saveOrUpdate(config, userId);
        
        log.info("🔍 [CONFIG DEBUG] Config sauvegardée - hospitalLogoUrl: {}",
            saved.getHospitalLogoUrl() != null ? saved.getHospitalLogoUrl().substring(0, Math.min(50, saved.getHospitalLogoUrl().length())) : "NULL");
        
        return ResponseEntity.ok(ApiResponse.success("Configuration mise à jour avec succès", toDTO(saved)));
    }

    @PostMapping("/initialize")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Initialiser la configuration par défaut")
    public ResponseEntity<ApiResponse<HospitalConfigDTO>> initializeDefault() {
        HospitalConfig config = configService.initializeDefault();
        return ResponseEntity.ok(ApiResponse.success("Configuration initialisée", toDTO(config)));
    }

    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Uploader le logo de l'hôpital (Admin uniquement)")
    public ResponseEntity<ApiResponse<String>> uploadLogo(
            @RequestPart("logo") MultipartFile logo) {
        try {
            String originalName = logo.getOriginalFilename() != null ? logo.getOriginalFilename().toLowerCase() : "";
            String contentType = logo.getContentType() != null ? logo.getContentType().toLowerCase() : "";
            boolean isSupportedFormat = originalName.endsWith(".png") || originalName.endsWith(".jpg")
                    || originalName.endsWith(".jpeg") || originalName.endsWith(".gif")
                    || contentType.contains("png") || contentType.contains("jpeg") || contentType.contains("gif");
            if (!isSupportedFormat) {
                log.warn("⚠️ Format logo non supporté: {} ({})", originalName, contentType);
                return ResponseEntity.badRequest().body(
                    ApiResponse.<String>error("Format non supporté: '" + originalName + "'. Utilisez PNG ou JPEG (pas WEBP, AVIF, SVG)."));
            }

            // ⚠️ Limite de taille : le logo est stocké en base (data-URI) → on évite les gros fichiers.
            long maxBytes = 1_500_000; // ~1,5 Mo
            if (logo.getSize() > maxBytes) {
                return ResponseEntity.badRequest().body(ApiResponse.<String>error(
                        "Logo trop volumineux (max 1,5 Mo). Compressez l'image ou réduisez sa résolution."));
            }

            // 🖼️ MULTI-INSTANCE : on stocke le logo EN BASE (base64 data-URI) et non sur le disque
            // local (éphémère sur Render, non partagé entre instances). Fonctionne partout,
            // survit aux redémarrages, aucun service externe requis.
            String mime = originalName.endsWith(".png") ? "image/png"
                    : (originalName.endsWith(".gif") ? "image/gif" : "image/jpeg");
            if (contentType.contains("png")) mime = "image/png";
            else if (contentType.contains("gif")) mime = "image/gif";
            else if (contentType.contains("jpeg")) mime = "image/jpeg";
            String logoUrl = "data:" + mime + ";base64,"
                    + java.util.Base64.getEncoder().encodeToString(logo.getBytes());

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            Long userId = getUserIdFromAuthentication(auth);
            HospitalConfig config = configService.getCurrentConfig().orElseGet(configService::initializeDefault);
            config.setHospitalLogoUrl(logoUrl);
            configService.saveOrUpdate(config, userId);

            log.info("✅ Logo hôpital sauvegardé en base ({} octets, {})", logo.getSize(), mime);
            return ResponseEntity.ok(ApiResponse.success("Logo mis à jour", logoUrl));
        } catch (IOException e) {
            log.error("❌ Erreur upload logo: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(ApiResponse.error("Erreur lors de l'upload du logo"));
        }
    }

    @GetMapping("/logo-status")
    @Operation(summary = "Statut du logo (diagnostic public)")
    public ResponseEntity<String> logoStatus() {
        String url = configService.getCurrentConfig()
                .map(c -> c.getHospitalLogoUrl())
                .orElse(null);
        if (url == null || url.isBlank()) {
            return ResponseEntity.ok("LOGO_NOT_CONFIGURED - aucun logo en base de données");
        }
        boolean isFile = url.startsWith("/uploads/");
        java.io.File f = isFile ? new java.io.File(url.substring(1)) : null;
        if (f != null && !f.exists()) f = new java.io.File(System.getProperty("user.dir"), url.substring(1));
        String fileStatus = (f != null) ? (f.exists() ? "fichier OK" : "fichier INTROUVABLE à " + f.getAbsolutePath()) : "URL externe/base64";
        return ResponseEntity.ok("LOGO_URL=" + url + " | " + fileStatus);
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
                .fichePrice(dto.getFichePrice() != null ? dto.getFichePrice() : new java.math.BigDecimal("3"))
                .build();
    }

    private Long getUserIdFromAuthentication(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            return ((CustomUserDetails) auth.getPrincipal()).getUser().getId();
        }
        return null;
    }
}
