package com.hospital.backend.controller;

import com.hospital.backend.model.AppConfig;
import com.hospital.backend.repository.AppConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/admin/settings")
@CrossOrigin(origins = {"https://inua-oux2.onrender.com", "https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class SettingsController {

    @Autowired
    private AppConfigRepository appConfigRepository;

    // Dossier local pour stocker les logos
    private final String UPLOAD_DIR = "uploads/logo/";

    @GetMapping
    public ResponseEntity<AppConfig> getSettings() {
        return appConfigRepository.findById(1L)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    // Si aucune config n'existe, on en crée une par défaut pour éviter le 404
                    AppConfig defaultConfig = new AppConfig();
                    defaultConfig.setId(1L);
                    defaultConfig.setAppName("INUA AFIA");
                    return ResponseEntity.ok(appConfigRepository.save(defaultConfig));
                });
    }

    @PutMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateSettings(
            @RequestPart("settings") AppConfig newConfig,
            @RequestPart(value = "logo", required = false) MultipartFile logo) {

        return appConfigRepository.findById(1L).map(config -> {
            try {
                // 1. Mise à jour des informations textuelles
                config.setAppName(newConfig.getAppName());
                config.setAppDescription(newConfig.getAppDescription());
                config.setTimezone(newConfig.getTimezone());
                config.setLanguage(newConfig.getLanguage());
                config.setSessionTimeout(newConfig.getSessionTimeout());
                config.setAllowSelfRegistration(newConfig.getAllowSelfRegistration());

                // 2. Traitement du fichier logo si présent
                if (logo != null && !logo.isEmpty()) {
                    File directory = new File(UPLOAD_DIR);
                    if (!directory.exists()) {
                        directory.mkdirs();
                    }

                    // Nom unique pour éviter le cache navigateur
                    String fileName = "logo_" + System.currentTimeMillis() + "_" + logo.getOriginalFilename();
                    Path path = Paths.get(UPLOAD_DIR + fileName);

                    Files.write(path, logo.getBytes());

                    // Mise à jour de l'URL
                    config.setLogoUrl("/uploads/logo/" + fileName);
                }

                // 3. Sauvegarde finale
                AppConfig saved = appConfigRepository.save(config);
                return ResponseEntity.ok(saved);

            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Erreur lors de l'enregistrement du fichier : " + e.getMessage());
            }
        }).orElse(ResponseEntity.notFound().build());
    }
}