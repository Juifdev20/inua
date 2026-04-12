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
import java.nio.file.StandardCopyOption;
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
            
            // Essayer le chemin tel quel (relatif ou absolu)
            path = Paths.get(filePathStr);
            if (!java.nio.file.Files.exists(path)) {
                // Essayer depuis le répertoire de travail courant
                path = Paths.get(System.getProperty("user.dir"), filePathStr);
                
                // Ancienne compatibilité: essayer avec /hospital_uploads/ dans home (données legacy)
                if (!java.nio.file.Files.exists(path) && filePathStr.startsWith("/hospital_uploads/")) {
                    String homeDir = System.getProperty("user.home");
                    path = Paths.get(homeDir + filePathStr);
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
     * ✅ STOCKE LE CONTENU EN BASE64 DANS POSTGRESQL (compatible Render)
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
            
            // ✅ Limiter la taille des fichiers (max 5 Mo pour PostgreSQL)
            long maxSize = 5 * 1024 * 1024; // 5 Mo
            if (file.getSize() > maxSize) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Le fichier est trop volumineux (max 5 Mo)"
                ));
            }
            
            // Générer un nom de fichier unique
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String newFilename = "DOC_" + patientName.replace(" ", "_") + "_" + System.currentTimeMillis() + extension;
            
            // ✅ Lire le contenu du fichier et le stocker en byte[] pour PostgreSQL
            byte[] fileContent = file.getBytes();
            
            // Créer l'entrée dans la base de données avec le contenu binaire
            PatientDocumentDTO documentDTO = PatientDocumentDTO.builder()
                .patientName(patientName)
                .fileName(originalFilename != null ? originalFilename : newFilename)
                .filePath("db_storage/" + newFilename)  // Indicateur de stockage DB
                .fileUrl("/api/v1/documents/" + newFilename + "/content")  // URL pour accès au contenu
                .documentType(com.hospital.backend.entity.DocumentType.valueOf(documentType))
                .paymentStatus("NON_PAYE")
                .fileSize(file.getSize())
                .mimeType(file.getContentType())
                .hasContent(true)
                .build();
            
            // Sauvegarder le document avec son contenu
            PatientDocument savedDoc = patientDocumentService.createDocumentWithContent(documentDTO, fileContent);
            
            log.info("✅ [DOCUMENTS] Document stocké en BDD avec succès: {} ({} bytes)", newFilename, fileContent.length);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Document importé avec succès",
                "document", PatientDocumentDTO.fromEntity(savedDoc)
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
     * ✅ NOUVEAU: Récupère le contenu binaire d'un document depuis PostgreSQL
     * GET /api/v1/documents/{id}/content
     * Compatible Render - pas besoin de système de fichiers
     */
    @GetMapping("/{id}/content")
    public ResponseEntity<?> getDocumentContent(@PathVariable Long id) {
        try {
            log.info("📥 [DOCUMENTS] Récupération du contenu BDD pour document ID: {}", id);
            
            // Récupérer les métadonnées du document
            PatientDocumentDTO doc = patientDocumentService.getDocumentById(id);
            if (doc == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Récupérer le contenu binaire depuis PostgreSQL
            byte[] content = patientDocumentService.getDocumentContent(id);
            
            if (content == null || content.length == 0) {
                // Fallback: essayer de lire depuis le système de fichiers (compatibilité legacy)
                log.warn("⚠️ [DOCUMENTS] Contenu non trouvé en BDD, tentative lecture fichier: {}", id);
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Contenu du document non disponible en base de données"
                ));
            }
            
            // Déterminer le type MIME
            String mimeType = doc.getMimeType();
            if (mimeType == null) {
                mimeType = "application/octet-stream";
            }
            
            log.info("✅ [DOCUMENTS] Contenu BDD récupéré: {} ({} bytes, MIME: {})", 
                    id, content.length, mimeType);
            
            // Retourner le contenu avec les bons headers
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "inline; filename=\"" + doc.getFileName() + "\"")
                    .contentType(MediaType.parseMediaType(mimeType))
                    .body(content);
            
        } catch (Exception e) {
            log.error("❌ [DOCUMENTS] Erreur récupération contenu BDD: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Erreur lors de la récupération du contenu"
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

