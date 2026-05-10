package com.hospital.backend.controller;

import com.hospital.backend.dto.PatientDocumentDTO;
import com.hospital.backend.entity.Consultation;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.PatientDocument;
import com.hospital.backend.repository.ConsultationRepository;
import com.hospital.backend.repository.PatientDocumentRepository;
import com.hospital.backend.repository.PatientRepository;
import com.hospital.backend.service.PatientDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR DOSSIER PATIENT - INTERFACE MÉDECIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Permet au médecin de :
 * - Voir les dossiers générés pour un patient
 * - Générer manuellement un dossier si besoin
 * - Visualiser le contenu PDF
 * 
 * Base Path: /api/v1/doctor/dossiers
 * ═══════════════════════════════════════════════════════════════════════════════
 */
@RestController
@RequestMapping("/api/v1/doctor/dossiers")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Doctor Dossiers", description = "Gestion des dossiers patients par le médecin")
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyAuthority('ROLE_DOCTEUR', 'ROLE_ADMIN')")
public class DoctorDossierController {

    private final PatientDocumentService patientDocumentService;
    private final PatientDocumentRepository patientDocumentRepository;
    private final PatientRepository patientRepository;
    private final ConsultationRepository consultationRepository;

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * LISTER LES DOSSIERS D'UN PATIENT
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * GET /api/v1/doctor/dossiers/patient/{patientId}
     * 
     * Retourne la liste des fiches médicales générées pour un patient spécifique.
     * Permet au médecin de voir l'historique complet.
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    @GetMapping("/patient/{patientId}")
    @Operation(summary = "Lister les dossiers d'un patient",
               description = "Récupère toutes les fiches médicales générées pour un patient")
    public ResponseEntity<?> getPatientDossiers(@PathVariable Long patientId) {
        try {
            Patient patient = patientRepository.findById(patientId).orElse(null);
            if (patient == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Patient non trouvé"));
            }

            log.info("📄 [DOCTOR_DOSSIER] Récupération des dossiers pour patient: {}", patientId);

            List<PatientDocument> documents = patientDocumentRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
            
            List<PatientDocumentDTO> dossiers = documents.stream()
                .map(PatientDocumentDTO::fromEntity)
                .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                "content", dossiers,
                "count", dossiers.size(),
                "patientName", patient.getFirstName() + " " + patient.getLastName(),
                "patientCode", patient.getPatientCode()
            ));

        } catch (Exception e) {
            log.error("❌ [DOCTOR_DOSSIER] Erreur: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Erreur lors de la récupération"));
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * GÉNÉRER UN DOSSIER MANUELLEMENT (pour une consultation)
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * POST /api/v1/doctor/dossiers/generate/{consultationId}
     * 
     * Le médecin peut forcer la génération d'un dossier même si la logique
     * automatique n'a pas fonctionné. Vérifie que tout est payé avant génération.
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    @PostMapping("/generate/{consultationId}")
    @Operation(summary = "Générer le dossier patient manuellement",
               description = "Force la génération de la fiche médicale pour une consultation")
    public ResponseEntity<?> generateDossier(@PathVariable Long consultationId) {
        log.info("🎯 [DOCTOR_DOSSIER] Requête de génération pour consultation: {}", consultationId);
        
        try {
            // ✅ Utiliser findByIdWithExams pour charger patient + examens
            Consultation consultation = consultationRepository.findByIdWithExams(consultationId).orElse(null);
            if (consultation == null) {
                log.error("❌ [DOCTOR_DOSSIER] Consultation {} non trouvée", consultationId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Consultation non trouvée"));
            }
            
            log.info("📋 [DOCTOR_DOSSIER] Consultation trouvée - Status: {}, Patient: {}", 
                consultation.getStatus(),
                consultation.getPatient() != null ? consultation.getPatient().getId() : "NULL");

            // Vérifier si déjà généré
            if (patientDocumentService.dossierExistsForConsultation(consultationId)) {
                log.info("📄 [DOCTOR_DOSSIER] Dossier existe déjà pour consultation: {}", consultationId);
                PatientDocument existing = patientDocumentRepository.findByConsultationId(consultationId).orElse(null);
                return ResponseEntity.ok(Map.of(
                    "message", "Un dossier existe déjà pour cette consultation",
                    "document", PatientDocumentDTO.fromEntity(existing),
                    "alreadyExists", true
                ));
            }

            log.info("🎯 [DOCTOR_DOSSIER] Appel generatePatientDossier pour consultation: {}", consultationId);

            // Générer le dossier
            PatientDocumentDTO dossier = patientDocumentService.generatePatientDossier(consultationId);
            
            log.info("✅ [DOCTOR_DOSSIER] Dossier généré avec succès: {}", dossier != null ? dossier.getId() : "NULL");

            if (dossier != null) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "✅ Dossier généré avec succès",
                    "document", dossier
                ));
            } else {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Échec de la génération du dossier"));
            }

        } catch (Exception e) {
            log.error("❌ [DOCTOR_DOSSIER] Erreur génération consultation {}: {}", consultationId, e.getMessage(), e);
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                .body(Map.of(
                    "error", "Erreur lors de la génération: " + e.getMessage(),
                    "exception", e.getClass().getSimpleName()
                ));
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * VÉRIFIER SI UN DOSSIER EXISTE POUR UNE CONSULTATION
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * GET /api/v1/doctor/dossiers/check/{consultationId}
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    @GetMapping("/check/{consultationId}")
    @Operation(summary = "Vérifier l'existence d'un dossier",
               description = "Vérifie si une fiche médicale a déjà été générée pour cette consultation")
    public ResponseEntity<?> checkDossierExists(@PathVariable Long consultationId) {
        try {
            boolean exists = patientDocumentService.dossierExistsForConsultation(consultationId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("exists", exists);
            response.put("consultationId", consultationId);
            
            if (exists) {
                PatientDocument doc = patientDocumentRepository.findByConsultationId(consultationId).orElse(null);
                response.put("document", PatientDocumentDTO.fromEntity(doc));
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [DOCTOR_DOSSIER] Erreur vérification: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Erreur lors de la vérification"));
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * TÉLÉCHARGER/VISIONNER UN DOSSIER
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * GET /api/v1/doctor/dossiers/{id}/content
     * 
     * Retourne le contenu binaire du PDF (pour visualisation inline ou téléchargement).
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    @GetMapping("/{id}/content")
    @Operation(summary = "Télécharger le dossier PDF",
               description = "Récupère le contenu binaire du dossier pour affichage ou téléchargement")
    public ResponseEntity<?> downloadDossier(@PathVariable Long id) {
        try {
            PatientDocument document = patientDocumentRepository.findById(id).orElse(null);
            if (document == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Dossier non trouvé"));
            }

            byte[] content = document.getContent();
            
            if (content == null || content.length == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                        "error", "Contenu non disponible",
                        "message", "Le contenu du document n'est pas disponible en base de données"
                    ));
            }

            log.info("📥 [DOCTOR_DOSSIER] Dossier téléchargé - ID: {}, Size: {} bytes", id, content.length);

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "inline; filename=\"" + document.getFileName() + "\"")
                .contentType(MediaType.parseMediaType(document.getMimeType() != null ? document.getMimeType() : "application/pdf"))
                .body(content);

        } catch (Exception e) {
            log.error("❌ [DOCTOR_DOSSIER] Erreur téléchargement: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Erreur lors du téléchargement"));
        }
    }
}
