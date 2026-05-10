package com.hospital.backend.service;

import com.hospital.backend.model.AppConfig;
import com.hospital.backend.repository.AppConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
public class AppConfigService {

    private final AppConfigRepository repository;
    private final String UPLOAD_DIR = "uploads/logo/";

    public AppConfig updateConfig(AppConfig newConfig, MultipartFile logo) {
        // 1. Récupérer la config existante (on suppose qu'il n'y a qu'une ligne ID=1)
        AppConfig existing = repository.findById(1L)
                .orElse(new AppConfig());

        // 2. Mettre à jour les champs texte
        existing.setAppName(newConfig.getAppName());
        existing.setAppDescription(newConfig.getAppDescription());
        existing.setTimezone(newConfig.getTimezone());
        existing.setLanguage(newConfig.getLanguage());
        existing.setSessionTimeout(newConfig.getSessionTimeout());

        // 3. Gérer le fichier Logo si présent
        if (logo != null && !logo.isEmpty()) {
            try {
                // Créer le dossier s'il n'existe pas
                File directory = new File(UPLOAD_DIR);
                if (!directory.exists()) {
                    directory.mkdirs();
                }

                // Générer un nom de fichier unique
                String fileName = "logo_" + System.currentTimeMillis() + "_" + logo.getOriginalFilename();
                Path path = Paths.get(UPLOAD_DIR + fileName);

                // Enregistrer le fichier physiquement
                Files.write(path, logo.getBytes());

                // Enregistrer l'URL relative dans la base de données
                existing.setLogoUrl("/uploads/logo/" + fileName);

            } catch (IOException e) {
                throw new RuntimeException("Erreur lors de l'enregistrement du logo", e);
            }
        }

        return repository.save(existing);
    }

    public AppConfig getConfig() {
        return repository.findById(1L).orElse(new AppConfig());
    }
}