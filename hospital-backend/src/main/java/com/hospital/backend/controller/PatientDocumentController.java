package com.hospital.backend.controller;

import com.hospital.backend.dto.PatientDocumentDTO;
import com.hospital.backend.entity.PatientDocument;
import com.hospital.backend.repository.PatientDocumentRepository;
import com.hospital.backend.service.PatientDocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/documents")
@CrossOrigin(origins = {"https://inua-oux2.onrender.com", "https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"}, exposedHeaders = "Content-Disposition")
@PreAuthorize("hasAnyAuthority('ROLE_RECEPTION', 'ROLE_ADMIN', 'ROLE_DOCTEUR')")
@RequiredArgsConstructor
@Slf4j
public class PatientDocumentController {

    private final PatientDocumentService patientDocumentService;
    private final PatientDocumentRepository patientDocumentRepository;

    /**
     * Récupère tous les documents patients
     * GET /api/v1/documents
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllDocuments() {
        try {
            log.info("📄 [DOCUMENTS] Récupération de tous les documents patients");
            
            List<PatientDocumentDTO> documents = patientDocumentService.getAllDocuments();
            
            Map<String, Object> response = Map.of(
                "content", documents,
                "count", documents.size()
            );
            
            log.info("✅ [DOCUMENTS] {} documents trouvés", documents.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [DOCUMENTS] Erreur lors de la récupération des documents: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Recherche les documents par nom de patient
     * GET /api/v1/documents/search?query=nom
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchDocuments(@RequestParam String query) {
        try {
            log.info("🔍 [DOCUMENTS] Recherche de documents pour: {}", query);
            
            List<PatientDocumentDTO> documents = patientDocumentService.searchByPatientName(query);
            
            Map<String, Object> response = Map.of(
                "content", documents,
                "count", documents.size()
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [DOCUMENTS] Erreur lors de la recherche: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Télécharge/Prévisualise un document PDF
     * GET /api/v1/documents/download/{id}
     */
    @GetMapping("/download/{id}")
    public ResponseEntity<?> downloadDocument(@PathVariable Long id) {
        try {
            log.info("📥 [DOCUMENTS] Téléchargement du document ID: {}", id);
            
            PatientDocument doc = patientDocumentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document non trouvé avec l'ID: " + id));

            // Résoudre le chemin du fichier - plusieurs tentatives
            Path path = null;
            String filePathStr = doc.getFilePath();
            
            // Essayer le chemin tel quel
            path = Paths.get(filePathStr);
            if (!java.nio.file.Files.exists(path)) {
                // Essayer avec le chemin home + chemin relatif
                String homeDir = System.getProperty("user.home");
                if (filePathStr.startsWith("/hospital_uploads/")) {
                    path = Paths.get(homeDir + filePathStr);
                } else if (!filePathStr.contains("/") && !filePathStr.contains("\\")) {
                    // Essayer dans le répertoire documents du projet
                    path = Paths.get(System.getProperty("user.dir"), "documents", filePathStr);
                }
            }
            
            // Vérifier si le fichier existe
            if (path == null || !java.nio.file.Files.exists(path)) {
                log.warn("⚠️ [DOCUMENTS] Fichier physique introuvable. Chemins essayés: original={}, userDir={}", 
                    filePathStr, path);
                
                // Retourner un message d'erreur plus clair
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Fichier physique introuvable sur le serveur",
                    "details", "Le fichier " + doc.getFileName() + " n'existe pas à l'emplacement prévu",
                    "pathAttempted", path != null ? path.toString() : filePathStr
                ));
            }

            Resource resource = new UrlResource(path.toUri());

            if (!resource.exists()) {
                log.warn("⚠️ [DOCUMENTS] Resource introuvable: {}", path);
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Resource introuvable"
                ));
            }

            // Détecter le type MIME basé sur l'extension
            String fileName = doc.getFileName();
            MediaType mediaType = MediaType.APPLICATION_PDF;
            if (fileName != null && fileName.toLowerCase().endsWith(".jpg")) {
                mediaType = MediaType.IMAGE_JPEG;
            } else if (fileName != null && fileName.toLowerCase().endsWith(".jpeg")) {
                mediaType = MediaType.IMAGE_JPEG;
            } else if (fileName != null && fileName.toLowerCase().endsWith(".png")) {
                mediaType = MediaType.IMAGE_PNG;
            }

            return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                .body(resource);
                
        } catch (Exception e) {
            log.error("❌ [DOCUMENTS] Erreur lors du téléchargement: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Erreur lors de la lecture du fichier: " + e.getMessage()
            ));
        }
    }

    /**
     * Importe un document patient
     * POST /api/v1/documents/upload
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("patientName") String patientName,
            @RequestParam(value = "documentType", defaultValue = "DOSSIER_PATIENT") String documentType) {
        try {
            log.info("📤 [DOCUMENTS] Import d'un document pour le patient: {}", patientName);
            
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Le fichier est vide"
                ));
            }
            
            // Créer le répertoire de stockage si nécessaire
            String uploadDir = System.getProperty("user.home") + "/hospital_uploads/documents";
            Path uploadPath = Paths.get(uploadDir);
            if (!java.nio.file.Files.exists(uploadPath)) {
                java.nio.file.Files.createDirectories(uploadPath);
            }
            
            // Générer un nom de fichier unique
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String newFilename = "DOC_" + patientName.replace(" ", "_") + "_" + System.currentTimeMillis() + extension;
            
            // Sauvegarder le fichier
            Path filePath = uploadPath.resolve(newFilename);
            java.nio.file.Files.copy(file.getInputStream(), filePath);
            
            // Créer l'entrée dans la base de données avec le chemin du système de fichiers
            PatientDocumentDTO documentDTO = PatientDocumentDTO.builder()
                .patientName(patientName)
                .fileName(originalFilename != null ? originalFilename : newFilename)
                .filePath(filePath.toString())  // CORRECT: stocker le chemin absolu du fichier
                .fileUrl("/hospital_uploads/documents/" + newFilename)
                .documentType(com.hospital.backend.entity.DocumentType.valueOf(documentType))
                .paymentStatus("NON_PAYE")
                .build();
            
            PatientDocumentDTO savedDocument = patientDocumentService.createDocument(documentDTO);
            
            log.info("✅ [DOCUMENTS] Document importé avec succès: {}", newFilename);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Document importé avec succès",
                "document", savedDocument
            ));
            
        } catch (Exception e) {
            log.error("❌ [DOCUMENTS] Erreur lors de l'import: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Erreur lors de l'import: " + e.getMessage()
            ));
        }
    }

    /**
     * Supprime un document patient
     * DELETE /api/v1/documents/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id) {
        try {
            log.info("🗑️ [DOCUMENTS] Suppression du document ID: {}", id);
            
            patientDocumentService.deleteDocument(id);
            
            log.info("✅ [DOCUMENTS] Document supprimé avec succès: {}", id);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Document supprimé avec succès"
            ));
            
        } catch (Exception e) {
            log.error("❌ [DOCUMENTS] Erreur lors de la suppression: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Erreur lors de la suppression: " + e.getMessage()
            ));
        }
    }
}

