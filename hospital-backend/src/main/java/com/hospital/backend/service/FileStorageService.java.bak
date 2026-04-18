package com.hospital.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Service de stockage de fichiers pour les scans de factures
 * Stocke les fichiers dans un répertoire configuré
 */
@Service
@Slf4j
public class FileStorageService {

    @Value("${app.file.storage.path:uploads}")
    private String storagePath;

    @Value("${app.file.base-url:http://localhost:8080/api/files}")
    private String baseUrl;

    /**
     * Stocke un fichier et retourne son URL d'accès
     * @param file Le fichier à stocker
     * @param subdirectory Sous-répertoire (ex: "factures-fournisseurs")
     * @return L'URL complète du fichier stocké
     */
    public String store(MultipartFile file, String subdirectory) {
        try {
            // Créer le répertoire s'il n'existe pas
            Path uploadPath = Paths.get(storagePath, subdirectory);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Générer un nom de fichier unique
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID().toString() + extension;

            // Sauvegarder le fichier
            Path targetPath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            // Retourner l'URL d'accès
            String url = baseUrl + "/" + subdirectory + "/" + filename;
            log.info("Fichier stocké: {}", url);
            return url;

        } catch (IOException e) {
            log.error("Erreur stockage fichier", e);
            throw new RuntimeException("Impossible de stocker le fichier", e);
        }
    }

    /**
     * Supprime un fichier
     */
    public void delete(String fileUrl) {
        try {
            // Extraire le chemin relatif de l'URL
            String relativePath = fileUrl.replace(baseUrl + "/", "");
            Path filePath = Paths.get(storagePath, relativePath);
            Files.deleteIfExists(filePath);
            log.info("Fichier supprimé: {}", filePath);
        } catch (IOException e) {
            log.error("Erreur suppression fichier", e);
        }
    }
}
