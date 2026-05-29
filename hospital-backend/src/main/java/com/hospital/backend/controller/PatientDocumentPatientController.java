package com.hospital.backend.controller;

import com.hospital.backend.dto.PatientDocumentDTO;
import com.hospital.backend.dto.PatientDocumentAccessRequest;
import com.hospital.backend.entity.Admission;
import com.hospital.backend.entity.Consultation;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.PatientDocument;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.ConsultationRepository;
import com.hospital.backend.repository.PatientDocumentRepository;
import com.hospital.backend.repository.PatientRepository;
import com.hospital.backend.repository.UserRepository;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR DOCUMENTS PATIENT (ESPACE PATIENT)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Gestion sécurisée des documents médicaux pour les patients.
 * 
 * SÉCURITÉ RENFORCÉE :
 * - Authentification requise (ROLE_PATIENT)
 * - Vérification du mot de passe pour chaque accès au document
 * - Documents générés uniquement si consultation terminée + tout payé
 * 
 * Base Path: /api/v1/patient/documents
 * ═══════════════════════════════════════════════════════════════════════════════
 */
@RestController
@RequestMapping("/api/v1/patient/documents")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Patient Documents", description = "Gestion sécurisée des documents médicaux patients")
@CrossOrigin(origins = "*")
@PreAuthorize("hasAuthority('ROLE_PATIENT')")
public class PatientDocumentPatientController {

    private final PatientDocumentService patientDocumentService;
    private final PatientDocumentRepository patientDocumentRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final ConsultationRepository consultationRepository;
    private final PasswordEncoder passwordEncoder;

    // Session temporaire pour l'accès aux documents (valide 5 minutes après vérif mot de passe)
    private final Map<String, DocumentAccessSession> accessSessions = new HashMap<>();

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * LISTE DES DOCUMENTS DU PATIENT CONNECTÉ
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * GET /api/v1/patient/documents
     * 
     * Retourne la liste des fiches médicales disponibles pour le patient.
     * Ne retourne que les métadonnées (pas le contenu PDF).
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Liste mes documents médicaux", 
               description = "Récupère la liste des fiches médicales disponibles")
    public ResponseEntity<?> getMyDocuments() {
        try {
            User currentUser = getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Utilisateur non authentifié"));
            }

            Patient patient = patientRepository.findByUser(currentUser).orElse(null);
            if (patient == null) {
                return ResponseEntity.ok(Map.of(
                    "content", List.of(),
                    "message", "Aucun profil patient associé"
                ));
            }

            log.info("📄 [PATIENT_DOCS] Récupération des documents pour: {}", patient.getFirstName() + " " + patient.getLastName());

            List<PatientDocument> documents = patientDocumentRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId());
            log.info("📄 [PATIENT_DOCS] {} documents bruts trouvés en BDD", documents.size());
            
            // Filtrer uniquement les documents de type DOSSIER_PATIENT (fiches médicales complètes)
            List<PatientDocumentDTO> dossiers = documents.stream()
                .filter(doc -> doc != null && doc.getDocumentType() == com.hospital.backend.entity.DocumentType.DOSSIER_PATIENT)
                .map(doc -> {
                    try {
                        return PatientDocumentDTO.fromEntity(doc);
                    } catch (Exception e) {
                        log.error("❌ [PATIENT_DOCS] Erreur conversion DTO pour doc ID {}: {}", doc.getId(), e.getMessage());
                        return null;
                    }
                })
                .filter(dto -> dto != null)
                .collect(Collectors.toList());

            log.info("✅ [PATIENT_DOCS] {} fiches médicales trouvées pour {}", dossiers.size(), patient.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("content", dossiers);
            response.put("count", dossiers.size());
            if (dossiers.isEmpty()) {
                response.put("message", "Aucune fiche médicale disponible. Les fiches sont générées automatiquement après consultation terminée et paiement complet.");
            }
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ [PATIENT_DOCS] Erreur: {}", e.getMessage(), e);
            // Retourner des détails en dev pour faciliter le diagnostic
            String errorDetail = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
            return ResponseEntity.internalServerError()
                .body(Map.of(
                    "error", "Erreur lors de la récupération des documents",
                    "detail", errorDetail != null ? errorDetail : "Erreur interne"
                ));
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * VÉRIFICATION MOT DE PASSE AVANT ACCÈS AU DOCUMENT
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * POST /api/v1/patient/documents/{id}/verify
     * 
     * Le patient doit confirmer son mot de passe pour déverrouiller l'accès.
     * Crée une session temporaire valide 5 minutes.
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    @PostMapping("/{id}/verify")
    @Operation(summary = "Vérifier le mot de passe pour accéder au document",
               description = "Confirme le mot de passe et crée une session d'accès temporaire (5 min)")
    public ResponseEntity<?> verifyPasswordForDocumentAccess(
            @PathVariable Long id,
            @RequestBody PatientDocumentAccessRequest request) {
        
        try {
            User currentUser = getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Utilisateur non authentifié"));
            }

            // Vérifier que le document existe et appartient au patient
            PatientDocument document = patientDocumentRepository.findById(id).orElse(null);
            if (document == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Document non trouvé"));
            }

            Patient patient = patientRepository.findByUser(currentUser).orElse(null);
            if (patient == null || !document.getPatientId().equals(patient.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Accès refusé - Ce document ne vous appartient pas"));
            }

            // Vérifier le mot de passe
            if (request == null || request.getPassword() == null || request.getPassword().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Mot de passe requis"));
            }

            boolean passwordValid = passwordEncoder.matches(request.getPassword(), currentUser.getPassword());
            
            if (!passwordValid) {
                log.warn("⚠️ [PATIENT_DOCS] Tentative d'accès avec mauvais mot de passe - User: {}, Doc: {}", 
                    currentUser.getUsername(), id);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Mot de passe incorrect"));
            }

            // Créer une session d'accès temporaire
            String sessionKey = currentUser.getId() + "_" + id;
            DocumentAccessSession session = new DocumentAccessSession(
                id, 
                currentUser.getId(), 
                LocalDateTime.now().plus(5, ChronoUnit.MINUTES)
            );
            accessSessions.put(sessionKey, session);

            log.info("🔓 [PATIENT_DOCS] Accès déverrouillé - User: {}, Doc: {}, Expire: {}", 
                currentUser.getUsername(), id, session.getExpiresAt());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Accès autorisé - Session valide 5 minutes",
                "sessionKey", sessionKey,
                "expiresAt", session.getExpiresAt().toString()
            ));

        } catch (Exception e) {
            log.error("❌ [PATIENT_DOCS] Erreur vérification: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Erreur lors de la vérification"));
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * TÉLÉCHARGEMENT DU DOCUMENT (APRÈS VÉRIFICATION MOT DE PASSE)
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * GET /api/v1/patient/documents/{id}/content
     * 
     * Nécessite une session active (créée via /verify).
     * Retourne le contenu binaire du PDF depuis PostgreSQL.
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    @GetMapping("/{id}/content")
    @Operation(summary = "Télécharger le document PDF",
               description = "Nécessite une session active (vérification mot de passe préalable)")
    public ResponseEntity<?> downloadDocument(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Utilisateur non authentifié"));
            }

            // Vérifier la session d'accès
            String sessionKey = currentUser.getId() + "_" + id;
            DocumentAccessSession session = accessSessions.get(sessionKey);
            
            if (session == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                        "error", "Accès non autorisé",
                        "message", "Veuillez d'abord confirmer votre mot de passe via /verify"
                    ));
            }

            if (session.isExpired()) {
                accessSessions.remove(sessionKey);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                        "error", "Session expirée",
                        "message", "La session a expiré. Veuillez re-confirmer votre mot de passe."
                    ));
            }

            // Vérifier que le document existe et appartient au patient
            PatientDocument document = patientDocumentRepository.findById(id).orElse(null);
            if (document == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Document non trouvé"));
            }

            Patient patient = patientRepository.findByUser(currentUser).orElse(null);
            if (patient == null || !document.getPatientId().equals(patient.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Accès refusé"));
            }

            // Récupérer le contenu binaire
            byte[] content = document.getContent();
            
            if (content == null || content.length == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                        "error", "Contenu non disponible",
                        "message", "Le contenu du document n'est pas disponible en base de données"
                    ));
            }

            // Déterminer le type MIME
            String mimeType = document.getMimeType();
            if (mimeType == null) {
                mimeType = "application/pdf";
            }

            log.info("📥 [PATIENT_DOCS] Document téléchargé - User: {}, Doc: {}, Size: {} bytes", 
                currentUser.getUsername(), id, content.length);

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "inline; filename=\"" + document.getFileName() + "\"")
                .contentType(MediaType.parseMediaType(mimeType))
                .body(content);

        } catch (Exception e) {
            log.error("❌ [PATIENT_DOCS] Erreur téléchargement: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Erreur lors du téléchargement"));
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * MÉTHODES UTILITAIRES
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || 
            "anonymousUser".equals(authentication.getPrincipal())) {
            return null;
        }
        
        String username = authentication.getName();
        return userRepository.findByEmailOrUsername(username, username).orElse(null);
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * VÉRIFICATION MOT DE PASSE AVANT ACCÈS À LA FICHE MÉDICALE (CONSULTATION)
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * POST /api/v1/patient/consultations/{consultationId}/verify
     * 
     * Le patient doit confirmer son mot de passe pour déverrouiller l'accès à sa fiche médicale.
     * Crée une session temporaire valide 5 minutes.
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    @PostMapping("/consultations/{consultationId}/verify")
    @Operation(summary = "Vérifier le mot de passe pour accéder à la fiche médicale",
               description = "Confirme le mot de passe et crée une session d'accès temporaire (5 min) à la fiche")
    public ResponseEntity<?> verifyPasswordForMedicalReport(
            @PathVariable Long consultationId,
            @RequestBody PatientDocumentAccessRequest request) {
        
        try {
            User currentUser = getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Utilisateur non authentifié"));
            }

            // Vérifier le mot de passe
            if (request == null || request.getPassword() == null || request.getPassword().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Mot de passe requis"));
            }

            // 🔒 VÉRIFICATION STRICTE : Vérifier que le mot de passe de l'utilisateur est bien encodé
            String storedPassword = currentUser.getPassword();
            if (storedPassword == null || storedPassword.isEmpty()) {
                log.error("❌ [PATIENT_REPORT] Mot de passe stocké null/vide pour l'utilisateur: {}", currentUser.getUsername());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur de configuration du compte - mot de passe manquant"));
            }

            // 🔒 VÉRIFICATION FORMAT BCRYPT: Le mot de passe doit commencer par $2a$, $2b$ ou $2y$
            if (!storedPassword.startsWith("$2a$") && !storedPassword.startsWith("$2b$") && !storedPassword.startsWith("$2y$")) {
                log.error("❌ [PATIENT_REPORT] Mot de passe non encodé (format invalide) pour l'utilisateur: {}, format détecté: {}", 
                    currentUser.getUsername(), storedPassword.substring(0, Math.min(10, storedPassword.length())));
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur de sécurité - mot de passe non conforme"));
            }

            // Debug: log pour vérifier le format du mot de passe stocké
            log.info("🔐 [PATIENT_REPORT] Vérification mot de passe - User: {}, StoredPassword format: {}, Input length: {}",
                currentUser.getUsername(),
                storedPassword.substring(0, 7),
                request.getPassword().length());

            boolean passwordValid = passwordEncoder.matches(request.getPassword(), storedPassword);
            
            if (!passwordValid) {
                log.warn("⚠️ [PATIENT_REPORT] Tentative d'accès avec mauvais mot de passe - User: {}, Consultation: {}, InputPass length: {}", 
                    currentUser.getUsername(), consultationId, request.getPassword().length());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Mot de passe incorrect"));
            }

            log.info("✅ [PATIENT_REPORT] Mot de passe validé avec succès - User: {}", currentUser.getUsername());

            // 💰 VÉRIFICATION PAIEMENT COMPLET : Vérifier que tout est payé avant d'autoriser l'accès
            Consultation consultation = consultationRepository.findById(consultationId).orElse(null);
            if (consultation == null) {
                log.error("❌ [PATIENT_REPORT] Consultation {} non trouvée", consultationId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Consultation non trouvée"));
            }
            
            Admission admission = consultation.getAdmission();
            if (admission != null) {
                java.math.BigDecimal totalDue = java.math.BigDecimal.ZERO;
                java.math.BigDecimal totalPaid = java.math.BigDecimal.ZERO;
                
                // ✅ CORRECTION: Utiliser les champs précis de Consultation pour éviter
                // le double-comptage (admission.serviceFee peut déjà inclure les examens)
                // Frais de fiche
                if (consultation.getFicheAmountDue() != null) {
                    totalDue = totalDue.add(java.math.BigDecimal.valueOf(consultation.getFicheAmountDue()));
                }
                
                // Frais de consultation
                if (consultation.getConsulAmountDue() != null) {
                    totalDue = totalDue.add(java.math.BigDecimal.valueOf(consultation.getConsulAmountDue()));
                }
                
                // Frais d'examens
                if (consultation.getExamTotalAmount() != null) {
                    totalDue = totalDue.add(consultation.getExamTotalAmount());
                }
                
                // Montant payé
                if (consultation.getFicheAmountPaid() != null) {
                    totalPaid = totalPaid.add(java.math.BigDecimal.valueOf(consultation.getFicheAmountPaid()));
                }
                if (consultation.getConsulAmountPaid() != null) {
                    totalPaid = totalPaid.add(java.math.BigDecimal.valueOf(consultation.getConsulAmountPaid()));
                }
                if (consultation.getExamAmountPaid() != null) {
                    totalPaid = totalPaid.add(consultation.getExamAmountPaid());
                }
                
                // Vérifier si tout est payé (avec marge de 0.01)
                java.math.BigDecimal remaining = totalDue.subtract(totalPaid);
                boolean isFullyPaid = totalPaid.compareTo(totalDue) >= 0 || 
                                     remaining.compareTo(new java.math.BigDecimal("0.01")) <= 0;
                
                log.info("💰 [PATIENT_REPORT] Vérification paiement - Consultation: {}, Total dû: {}, Payé: {}, Reste: {}, Tout payé: {}",
                    consultationId, totalDue, totalPaid, remaining, isFullyPaid);
                
                if (!isFullyPaid) {
                    log.warn("⛔ [PATIENT_REPORT] Accès REFUSÉ - Paiement incomplet. Reste à payer: {} $", remaining);
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of(
                            "error", "Accès refusé - Paiement incomplet",
                            "message", "Vous devez régler l'intégralité de votre facture avant d'accéder à cette fiche",
                            "remainingAmount", remaining.toString()
                        ));
                }
            }
            
            // Créer une session d'accès temporaire (5 minutes)
            String sessionKey = currentUser.getId() + "_report_" + consultationId;
            DocumentAccessSession session = new DocumentAccessSession(
                consultationId, 
                currentUser.getId(), 
                LocalDateTime.now().plus(5, ChronoUnit.MINUTES)
            );
            accessSessions.put(sessionKey, session);

            log.info("🔓 [PATIENT_REPORT] Accès déverrouillé - User: {}, Consultation: {}, Expire: {}", 
                currentUser.getUsername(), consultationId, session.getExpiresAt());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Accès autorisé - Session valide 5 minutes",
                "sessionKey", sessionKey,
                "expiresAt", session.getExpiresAt().toString()
            ));

        } catch (Exception e) {
            log.error("❌ [PATIENT_REPORT] Erreur vérification: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Erreur lors de la vérification"));
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * VÉRIFICATION SI LA SESSION DE FICHE MÉDICALE EST VALIDE
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * GET /api/v1/patient/consultations/{consultationId}/check-access
     * 
     * Vérifie si une session d'accès est encore valide pour une fiche médicale.
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    @GetMapping("/consultations/{consultationId}/check-access")
    @Operation(summary = "Vérifier si l'accès à la fiche est autorisé",
               description = "Vérifie si une session d'accès active existe")
    public ResponseEntity<?> checkMedicalReportAccess(@PathVariable Long consultationId) {
        try {
            User currentUser = getCurrentUser();
            if (currentUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Utilisateur non authentifié"));
            }

            String sessionKey = currentUser.getId() + "_report_" + consultationId;
            DocumentAccessSession session = accessSessions.get(sessionKey);

            if (session == null || session.isExpired()) {
                if (session != null && session.isExpired()) {
                    accessSessions.remove(sessionKey);
                }
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                        "access", false,
                        "message", "Veuillez confirmer votre mot de passe"
                    ));
            }

            return ResponseEntity.ok(Map.of(
                "access", true,
                "message", "Accès autorisé",
                "expiresAt", session.getExpiresAt().toString()
            ));

        } catch (Exception e) {
            log.error("❌ [PATIENT_REPORT] Erreur vérification accès: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Erreur lors de la vérification"));
        }
    }

    /**
     * Classe interne pour gérer les sessions d'accès temporaires
     */
    private static class DocumentAccessSession {
        private final Long documentId;
        private final Long userId;
        private final LocalDateTime expiresAt;

        public DocumentAccessSession(Long documentId, Long userId, LocalDateTime expiresAt) {
            this.documentId = documentId;
            this.userId = userId;
            this.expiresAt = expiresAt;
        }

        public Long getDocumentId() { return documentId; }
        public Long getUserId() { return userId; }
        public LocalDateTime getExpiresAt() { return expiresAt; }
        
        public boolean isExpired() {
            return LocalDateTime.now().isAfter(expiresAt);
        }
    }
}
