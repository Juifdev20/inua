package com.hospital.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Controller pour servir les fichiers stockés (scans de factures)
 */
@RestController
@RequestMapping({"/api/files", "/api/v1/files"})
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Fichiers", description = "Accès aux fichiers stockés (factures)")
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class FileController {

    @Value("${app.file.storage.path:uploads}")
    private String storagePath;

    @GetMapping("/{subdirectory}/{filename}")
    @Operation(summary = "Télécharger un fichier", description = "Accès aux scans de factures")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable String subdirectory,
            @PathVariable String filename) {
        try {
            Path filePath = Paths.get(storagePath, subdirectory, filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                log.error("Fichier non trouvé ou illisible: {}", filePath);
                return ResponseEntity.notFound().build();
            }

            // Sécurité: vérifier que le chemin reste dans le répertoire de stockage
            Path storageRoot = Paths.get(storagePath).normalize();
            if (!filePath.startsWith(storageRoot)) {
                log.warn("Tentative d'accès hors répertoire: {}", filePath);
                return ResponseEntity.badRequest().build();
            }

            String contentType = determineContentType(filename);

            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);

        } catch (Exception e) {
            log.error("Erreur téléchargement fichier {}/{}: {}", subdirectory, filename, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    private String determineContentType(String filename) {
        String lowerName = filename.toLowerCase();
        if (lowerName.endsWith(".pdf")) {
            return "application/pdf";
        } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
            return "image/jpeg";
        } else if (lowerName.endsWith(".png")) {
            return "image/png";
        } else if (lowerName.endsWith(".gif")) {
            return "image/gif";
        }
        return "application/octet-stream";
    }
}
