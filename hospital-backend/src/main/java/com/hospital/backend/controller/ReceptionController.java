package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.dto.PatientDocumentDTO;
import com.hospital.backend.dto.ReceptionPaymentDTO;
import com.hospital.backend.dto.ReceptionStatsDTO;
import com.hospital.backend.dto.TodayProcessedDTO;
import com.hospital.backend.entity.Consultation;
import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.entity.DocumentType;
import com.hospital.backend.entity.PrescribedExamStatus;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.ConsultationRepository;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.service.ConsultationService;
import com.hospital.backend.service.PatientDocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.io.File;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/v1/reception")
@PreAuthorize("hasAnyAuthority('ROLE_RECEPTION', 'ROLE_ADMIN')")
@Tag(name = "Réception")
@RequiredArgsConstructor
@Slf4j
public class ReceptionController {

    private final ConsultationService consultationService;
    private final ConsultationRepository consultationRepository;
    private final PatientDocumentService patientDocumentService;

    // ✅ NOUVEAU: Endpoint pour récupérer les consultations en attente de paiement (PENDING_PAYMENT)
    @GetMapping("/consultations/pending")
    public ResponseEntity<?> getPendingConsultations() {
        log.info("🔍 [RECEPTION] Récupération des consultations en attente de paiement (PENDING_PAYMENT)");
        
        try {
            // Récupérer les PendingPaymentDTO depuis le service
            List<com.hospital.backend.dto.PendingPaymentDTO> pendingDTOs = consultationService.getPendingPayments();
            
            // Obtenir la date du jour pour le calcul isToday
            LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
            LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);
            
            // Mapper vers ReceptionPaymentDTO en incluant le montant total et isToday
            List<ReceptionPaymentDTO> consultations = pendingDTOs.stream()
                .map(pending -> {
                    // Vérifier si la consultation est d'aujourd'hui
                    boolean isToday = pending.getCreatedAt() != null && 
                                     !pending.getCreatedAt().isBefore(startOfDay) && 
                                     !pending.getCreatedAt().isAfter(endOfDay);
                    
                    return ReceptionPaymentDTO.builder()
                        .id(pending.getConsultationId())
                        .patientId(pending.getPatientId())
                        .patientName(pending.getPatientName())
                        .patientPhoto(pending.getPatientPhoto())
                        .doctorId(pending.getDoctorId())
                        .doctorName(pending.getDoctorName())
                        .motif("Consultation terminée")
                        .status(pending.getStatus())
                        .createdAt(pending.getCreatedAt())
                        .isToday(isToday)  // ✅ NOUVEAU: Champ isToday
                        // Si des examens sont prescrits, les utiliser
                        // Sinon, si examTotalAmount > 0, créer un examen placeholder
                        .exams(!pending.getPrescribedExams().isEmpty() ? 
                            pending.getPrescribedExams().stream()
                                .map(exam -> ReceptionPaymentDTO.ExamItemDTO.builder()
                                    .serviceId(exam.getServiceId())
                                    .note(exam.getDoctorNote())
                                    .build())
                                .collect(java.util.stream.Collectors.toList()) :
                            (pending.getExamTotalAmount() != null && pending.getExamTotalAmount().compareTo(BigDecimal.ZERO) > 0 ?
                                List.of(ReceptionPaymentDTO.ExamItemDTO.builder()
                                    .serviceId(null)
                                    .note("Examens prescrits - Montant total: " + pending.getExamTotalAmount())
                                    .build()) :
                                List.of()))
                        .totalAmount(pending.getExamTotalAmount())       // ✅ Montant total
                        .examAmountPaid(pending.getExamAmountPaid())    // ✅ Montant payé
                        .build();
                })
                .collect(java.util.stream.Collectors.toList());
            
            // ✅ TRIER par createdAt décroissant (les plus récents en premier)
            consultations.sort((a, b) -> {
                if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
                if (a.getCreatedAt() == null) return 1;
                if (b.getCreatedAt() == null) return -1;
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            });
            
            log.info("✅ [RECEPTION] {} consultations en attente trouvées", consultations.size());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "content", consultations,
                "count", consultations.size()
            ));
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de la récupération des consultations en attente: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/consultations")
    public ResponseEntity<?> getConsultationsByStatus(@RequestParam String status) {
        log.info("🔍 [RECEPTION] Récupération des consultations avec statut: {}", status);
        
        try {
            List<ReceptionPaymentDTO> consultations;
            
            if ("ATTENTE_PAIEMENT_LABO".equals(status)) {
                consultations = consultationService.getReceptionPendingPayments();
            } else if ("PENDING_PAYMENT".equals(status)) {
                // Récupérer les consultations en attente de paiement (nouvelles terminées par les docteurs)
                consultations = consultationService.getPendingPayments().stream()
                    .map(pending -> ReceptionPaymentDTO.builder()
                        .id(pending.getConsultationId())
                        .patientId(pending.getPatientId())
                        .patientName(pending.getPatientName())
                        .patientPhoto(pending.getPatientPhoto())
                        .doctorId(pending.getDoctorId())
                        .doctorName(pending.getDoctorName())
                        .motif("Consultation terminée") // Utiliser un motif par défaut
                        .status(pending.getStatus())
                        .createdAt(pending.getCreatedAt())
                        // Si des examens sont prescrits, les utiliser
                        // Sinon, si examTotalAmount > 0, créer un examen placeholder
                        .exams(!pending.getPrescribedExams().isEmpty() ? 
                            pending.getPrescribedExams().stream()
                                .map(exam -> ReceptionPaymentDTO.ExamItemDTO.builder()
                                    .serviceId(exam.getServiceId())
                                    .note(exam.getDoctorNote())
                                    .build())
                                .collect(java.util.stream.Collectors.toList()) :
                            (pending.getExamTotalAmount() != null && pending.getExamTotalAmount().compareTo(BigDecimal.ZERO) > 0 ?
                                List.of(ReceptionPaymentDTO.ExamItemDTO.builder()
                                    .serviceId(null)
                                    .note("Examens prescrits - Montant total: " + pending.getExamTotalAmount())
                                    .build()) :
                                List.of()))
                        .totalAmount(pending.getExamTotalAmount())       // ✅ Montant total
                        .examAmountPaid(pending.getExamAmountPaid())    // ✅ Montant payé
                        .build())
                    .collect(java.util.stream.Collectors.toList());
            } else {
                // Autres statuts si nécessaire
                consultations = List.of();
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "content", consultations,
                "count", consultations.size()
            ));
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de la récupération des consultations: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/dashboard")
    public ApiResponse<String> dashboard() {
        return ApiResponse.success("Dashboard Réception");
    }

    @GetMapping("/pending-payments")
    public ResponseEntity<Map<String, Object>> getPendingPayments() {
        try {
            log.info("🔍 [RECEPTION] Récupération des consultations en attente de paiement labo");
            
            List<ReceptionPaymentDTO> pendingPayments = consultationService.getReceptionPendingPayments();
            
            Map<String, Object> response = Map.of("content", pendingPayments);
            
            log.info("✅ [RECEPTION] {} consultations en attente trouvées", pendingPayments.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de la récupération des paiements en attente: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/today-processed")
    public ResponseEntity<Map<String, Object>> getTodayProcessed() {
        try {
            log.info("🔍 [RECEPTION] Récupération des consultations traitées aujourd'hui");
            
            List<TodayProcessedDTO> processedConsultations = consultationService.getTodayProcessedConsultations();
            
            Map<String, Object> response = Map.of("content", processedConsultations);
            
            log.info("✅ [RECEPTION] {} consultations traitées aujourd'hui", processedConsultations.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de la récupération des consultations traitées: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<ReceptionStatsDTO> getStats() {
        try {
            log.info("📊 [RECEPTION] Récupération des statistiques");
            
            ReceptionStatsDTO stats = consultationService.getReceptionStats();
            
            log.info("✅ [RECEPTION] Statistiques calculées - En attente: {}, Montant: {}, Traitées: {}, Revenus: {}", 
                    stats.getTotalPending(), stats.getTotalAmount(), stats.getTodayProcessed(), stats.getTodayRevenue());
            
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors du calcul des statistiques: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ✅ NOUVEAU: Endpoint pour les statistiques du dashboard réception (simplifié)
    @GetMapping("/dashboard/stats")
    public ResponseEntity<com.hospital.backend.dto.DashboardStatsDTO> getDashboardStats() {
        try {
            log.info("📊 [RECEPTION] Récupération des statistiques du dashboard");
            
            // Calculer les dates du jour
            LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
            LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);
            
            // 1. Admissions du jour (compter toutes les consultations créées aujourd'hui)
            long admissionsJour = consultationRepository.countAdmissionsToday(startOfDay, endOfDay);
            
            // 2. En attente (statut EN_ATTENTE) - utilise la méthode existante countByStatus
            long enAttente = consultationRepository.countByStatus(ConsultationStatus.EN_ATTENTE);
            
            // 3. Fiches transmises (statuts: EN_COURS, LABORATOIRE_EN_ATTENTE, PENDING_PAYMENT, PAID_PENDING_LAB)
            List<ConsultationStatus> transmittedStatuses = List.of(
                ConsultationStatus.EN_COURS,
                ConsultationStatus.LABORATOIRE_EN_ATTENTE,
                ConsultationStatus.PENDING_PAYMENT,
                ConsultationStatus.PAID_PENDING_LAB
            );
            long fichesTransmises = consultationRepository.countFichesTransmises(transmittedStatuses);
            
            // 4. Terminées aujourd'hui (statuts: TERMINE, COMPLETED)
            List<ConsultationStatus> terminatedStatuses = List.of(
                ConsultationStatus.TERMINE,
                ConsultationStatus.COMPLETED
            );
            long terminees = consultationRepository.countTermineesToday(terminatedStatuses, startOfDay, endOfDay);
            
            // 5. Revenu du jour (somme des examAmountPaid aujourd'hui)
            // Pour simplifier, on utilise les consultations terminées
            Double todayRevenue = 0.0;
            
            // 6. Dernières consultations (5 dernières du jour)
            List<Consultation> recentConsultations = consultationRepository.findRecentAdmissionsToday(
                startOfDay, endOfDay, PageRequest.of(0, 5)
            );
            
            List<com.hospital.backend.dto.DashboardStatsDTO.RecentConsultationDTO> recentDTOs = recentConsultations.stream()
                .map(c -> com.hospital.backend.dto.DashboardStatsDTO.RecentConsultationDTO.builder()
                    .id(c.getId())
                    .patientName(c.getPatient() != null ? c.getPatient().getFirstName() + " " + c.getPatient().getLastName() : "Inconnu")
                    .serviceName(c.getService() != null ? c.getService().getNom() : (c.getDoctor() != null ? "Dr. " + c.getDoctor().getLastName() : "Non assigné"))
                    .arrivalTime(c.getCreatedAt() != null ? c.getCreatedAt().toLocalTime().toString() : "--:--")
                    .status(c.getStatus() != null ? c.getStatus().name() : "UNKNOWN")
                    .statusLabel(getStatusLabel(c.getStatus()))
                    .build())
                .collect(java.util.stream.Collectors.toList());
            
            // Construire le DTO
            com.hospital.backend.dto.DashboardStatsDTO stats = com.hospital.backend.dto.DashboardStatsDTO.builder()
                .admissionsJour(admissionsJour)
                .enAttente(enAttente)
                .fichesTransmises(fichesTransmises)
                .terminees(terminees)
                .todayRevenue(todayRevenue)
                .recentConsultations(recentDTOs)
                .build();
            
            log.info("✅ [RECEPTION] Dashboard stats - Admissions: {}, En attente: {}, Transmises: {}, Terminées: {}", 
                    admissionsJour, enAttente, fichesTransmises, terminees);
            
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors du calcul des stats dashboard: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // Méthode utilitaire pour le label du statut
    private String getStatusLabel(ConsultationStatus status) {
        if (status == null) return "Inconnu";
        return switch (status) {
            case EN_ATTENTE -> "En attente";
            case ARRIVED -> "Arrivé";
            case EN_COURS -> "En cours";
            case LABORATOIRE_EN_ATTENTE -> "Au laboratoire";
            case PENDING_PAYMENT -> "En attente paiement";
            case PAID_PENDING_LAB -> "Payé, en attente labo";
            case TERMINE, COMPLETED -> "Terminé";
            case CANCELLED, ANNULE -> "Annulé";
            default -> status.name();
        };
    }

    @PutMapping("/consultations/{id}/pay-lab")
    public ResponseEntity<ApiResponse<String>> updateExamPaymentAndSendToLab(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        try {
            log.info("💰 [RECEPTION] Traitement du paiement labo pour consultation ID: {}", id);
            
            Double examAmountPaid = ((Number) request.get("examAmountPaid")).doubleValue();
            String status = (String) request.get("status");
            
            // Valider que le statut est "labo"
            if (!"labo".equals(status)) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Statut invalide. Valeur attendue: 'labo'"));
            }
            
            // Mettre à jour le paiement et envoyer au laboratoire
            consultationService.updateExamPaymentAndSendToLab(id, examAmountPaid);
            
            log.info("✅ [RECEPTION] Paiement labo traité avec succès - Montant: {}, Statut: {}", examAmountPaid, status);
            
            return ResponseEntity.ok(ApiResponse.success("Paiement traité et consultation envoyée au laboratoire"));
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors du traitement du paiement labo: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Erreur lors du traitement du paiement"));
        }
    }

    // Anciens endpoints pour compatibilité
    @GetMapping("/legacy/pending-payments")
    public ResponseEntity<List<com.hospital.backend.dto.PendingPaymentDTO>> getLegacyPendingPayments() {
        try {
            log.info("🔍 [RECEPTION] Récupération des paiements en attente (legacy)");
            
            List<com.hospital.backend.dto.PendingPaymentDTO> pendingPayments = consultationService.getPendingPayments();
            
            log.info("✅ [RECEPTION] {} paiements en attente trouvés (legacy)", pendingPayments.size());
            return ResponseEntity.ok(pendingPayments);
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de la récupération des paiements en attente (legacy): {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/process-payment/{consultationId}")
    public ResponseEntity<ApiResponse<String>> processPayment(
            @PathVariable Long consultationId,
            @RequestBody PaymentRequest paymentRequest) {
        try {
            log.info("💰 [RECEPTION] Traitement du paiement pour consultation ID: {} - Montant: {}", 
                    consultationId, paymentRequest.getAmountPaid());
            
            // Valider que le montant payé correspond au montant total
            BigDecimal totalAmount = consultationService.calculatePrescriptionTotal(consultationId);
            
            if (paymentRequest.getAmountPaid().compareTo(totalAmount) < 0) {
                log.warn("⚠️ [RECEPTION] Montant insuffisant - Requis: {}, Payé: {}", 
                        totalAmount, paymentRequest.getAmountPaid());
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Montant payé inférieur au montant requis"));
            }
            
            // Mettre à jour le statut de paiement
            consultationService.updatePaymentStatus(consultationId, paymentRequest.getAmountPaid());
            
            log.info("✅ [RECEPTION] Paiement traité avec succès pour consultation ID: {}", consultationId);
            return ResponseEntity.ok(ApiResponse.success("Paiement traité avec succès"));
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors du traitement du paiement: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Erreur lors du traitement du paiement"));
        }
    }

    @PostMapping("/send-to-lab/{consultationId}")
    public ResponseEntity<ApiResponse<String>> sendToLab(@PathVariable Long consultationId) {
        try {
            log.info("🧪 [RECEPTION] Envoi au laboratoire pour consultation ID: {}", consultationId);
            
            // Mettre à jour le statut pour envoyer au laboratoire
            consultationService.updatePaymentStatus(consultationId, 
                    consultationService.calculatePrescriptionTotal(consultationId));
            
            log.info("✅ [RECEPTION] Consultation ID: {} envoyée au laboratoire", consultationId);
            return ResponseEntity.ok(ApiResponse.success("Consultation envoyée au laboratoire"));
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de l'envoi au laboratoire: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Erreur lors de l'envoi au laboratoire"));
        }
    }

    // DTO pour la requête de paiement
    public static class PaymentRequest {
        private BigDecimal amountPaid;
        
        public BigDecimal getAmountPaid() { return amountPaid; }
        public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }
    }

    // ========================================
    // ✅ NOUVEAU: Endpoints pour les Documents
    // ========================================

    /**
     * Récupère tous les documents patients pour la réception
     * GET /api/v1/reception/documents
     */
    @GetMapping("/documents")
    public ResponseEntity<Map<String, Object>> getAllDocuments() {
        try {
            log.info("📄 [RECEPTION] Récupération de tous les documents patients");
            
            List<PatientDocumentDTO> documents = patientDocumentService.getAllDocuments();
            
            Map<String, Object> response = Map.of(
                "content", documents,
                "count", documents.size()
            );
            
            log.info("✅ [RECEPTION] {} documents trouvés", documents.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de la récupération des documents: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Recherche les documents par nom de patient
     * GET /api/v1/reception/documents/search?query=nom
     */
    @GetMapping("/documents/search")
    public ResponseEntity<Map<String, Object>> searchDocuments(@RequestParam String query) {
        try {
            log.info("🔍 [RECEPTION] Recherche de documents pour: {}", query);
            
            List<PatientDocumentDTO> documents = patientDocumentService.searchByPatientName(query);
            
            Map<String, Object> response = Map.of(
                "content", documents,
                "count", documents.size()
            );
            
            log.info("✅ [RECEPTION] {} documents trouvés pour la recherche: {}", documents.size(), query);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de la recherche de documents: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Prévisualise un document PDF dans un nouvel onglet
     * GET /api/v1/reception/documents/{id}/preview
     */
    @GetMapping("/documents/{id}/preview")
    public ResponseEntity<?> previewDocument(@PathVariable Long id) {
        try {
            log.info("👁️ [RECEPTION] Prévisualisation du document ID: {}", id);
            
            PatientDocumentDTO document = patientDocumentService.getDocumentById(id);
            
            if (document == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Retourne l'URL du fichier pour ouverture dans un nouvel onglet
            return ResponseEntity.ok(Map.of(
                "fileUrl", document.getFileUrl(),
                "fileName", document.getFileName()
            ));
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de la prévisualisation: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Télécharge un document PDF
     * GET /api/v1/reception/documents/{id}/download
     */
    @GetMapping("/documents/{id}/download")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable Long id) {
        try {
            log.info("📥 [RECEPTION] Téléchargement du document ID: {}", id);
            
            String filePath = patientDocumentService.getFilePath(id);
            
            if (filePath == null) {
                return ResponseEntity.notFound().build();
            }
            
            File file = new File(filePath);
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }
            
            // Lire le fichier en bytes
            byte[] fileBytes = Files.readAllBytes(file.toPath());
            
            // Retourner avec les bons headers pour inline (vision) ou attachment (téléchargement)
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getName() + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(fileBytes);
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors du téléchargement: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Importe un document patient
     * POST /api/v1/reception/documents/upload
     */
    @PostMapping("/documents/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("patientName") String patientName,
            @RequestParam(value = "documentType", defaultValue = "DOSSIER_PATIENT") String documentType) {
        try {
            log.info("📤 [RECEPTION] Import d'un document pour le patient: {}", patientName);
            
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Le fichier est vide"
                ));
            }
            
            // Créer le répertoire de stockage si nécessaire (chemin relatif pour production)
            String uploadDir = "uploads/documents";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
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
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            // Créer l'entrée dans la base de données
            PatientDocumentDTO documentDTO = PatientDocumentDTO.builder()
                .patientName(patientName)
                .fileName(originalFilename != null ? originalFilename : newFilename)
                .fileUrl("/uploads/documents/" + newFilename)
                .documentType(DocumentType.valueOf(documentType))
                .paymentStatus("NON_PAYE")
                .build();
            
            PatientDocumentDTO savedDocument = patientDocumentService.createDocument(documentDTO);
            
            log.info("✅ [RECEPTION] Document importé avec succès: {}", newFilename);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Document importé avec succès",
                "document", savedDocument
            ));
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de l'import du document: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Erreur lors de l'import du document: " + e.getMessage()
            ));
        }
    }

    /**
     * Supprime un document patient
     * DELETE /api/v1/reception/documents/{id}
     */
    @DeleteMapping("/documents/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id) {
        try {
            log.info("🗑️ [RECEPTION] Suppression du document ID: {}", id);
            
            patientDocumentService.deleteDocument(id);
            
            log.info("✅ [RECEPTION] Document supprimé avec succès: {}", id);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Document supprimé avec succès"
            ));
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de la suppression du document: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Erreur lors de la suppression du document: " + e.getMessage()
            ));
        }
    }

    // ========================================
    // ✅ NOUVEAU: Endpoints pour le Profil Réception
    // ========================================

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserRepository userRepository;

    // ✅ CORRECTION: Utiliser un chemin relatif pour les uploads (compatible tous OS)
    private final String AVATAR_UPLOAD_DIR = "uploads/avatars/";

    /**
     * PUT /api/v1/reception/profile/password
     * Changement de mot de passe avec vérification de l'ancien
     */
    @PutMapping("/profile/password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> passwordData) {
        try {
            // ✅ CORRECTION: Récupérer username depuis SecurityContextHolder au lieu de @AuthenticationPrincipal
            String username = getCurrentUsername();
            log.info("🔐 [RECEPTION] Demande de changement de mot de passe pour: {}", username);
            
            String oldPassword = passwordData.get("ancienPassword");
            String newPassword = passwordData.get("nouveauPassword");
            
            if (oldPassword == null || newPassword == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "L'ancien mot de passe et le nouveau mot de passe sont requis"
                ));
            }
            
            // Récupérer l'utilisateur connecté depuis la base de données
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            
            // Vérifier l'ancien mot de passe avec BCrypt
            if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
                log.warn("⚠️ [RECEPTION] Ancien mot de passe incorrect pour l'utilisateur: {}", user.getUsername());
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "L'ancien mot de passe est incorrect"
                ));
            }
            
            // Encoder le nouveau mot de passe et sauvegarder
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            
            log.info("✅ [RECEPTION] Mot de passe changé avec succès pour: {}", user.getUsername());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Mot de passe changé avec succès"
            ));
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors du changement de mot de passe: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Erreur lors du changement de mot de passe: " + e.getMessage()
            ));
        }
    }

    /**
     * POST /api/v1/reception/profile/avatar
     * Upload de l'avatar utilisateur
     * Stockage local (uploads/avatars/)
     */
    @PostMapping("/profile/avatar")
    @Transactional
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file) {
        try {
            String username = getCurrentUsername();
            log.info("📸 [RECEPTION] Upload d'avatar pour: {}", username);
            
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Le fichier est vide"
                ));
            }
            
            // Récupérer l'utilisateur
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            
            // Créer le répertoire si nécessaire
            Path uploadPath = Paths.get(AVATAR_UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            // Générer un nom de fichier unique
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String newFilename = "avatar_" + user.getId() + "_" + System.currentTimeMillis() + extension;
            
            // Sauvegarder le fichier
            Path filePath = uploadPath.resolve(newFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            // Mettre à jour le chemin dans la base de données
            String photoUrl = "/uploads/avatars/" + newFilename;
            user.setPhotoUrl(photoUrl);
            userRepository.save(user);
            
            log.info("✅ [RECEPTION] Avatar uploadé avec succès: {}", newFilename);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Avatar mis à jour avec succès",
                "photoUrl", photoUrl
            ));
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de l'upload d'avatar: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Erreur lors de l'upload de l'avatar: " + e.getMessage()
            ));
        }
    }

    /**
     * PUT /api/v1/reception/profile/update
     * Mise à jour des informations du profil (fullName, phone)
     */
    @PutMapping("/profile/update")
    @Transactional
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> profileData) {
        try {
            // ✅ CORRECTION: Récupérer username depuis SecurityContextHolder au lieu de @AuthenticationPrincipal
            String username = getCurrentUsername();
            log.info("✏️ [RECEPTION] Mise à jour du profil pour: {}", username);
            
            // Récupérer l'utilisateur
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            
            // Mettre à jour les champs fournis
            if (profileData.get("fullName") != null) {
                String fullName = profileData.get("fullName");
                // Parser le nom complet (supposé format: "Prénom Nom" ou juste "Prénom")
                String[] parts = fullName.trim().split("\\s+");
                if (parts.length >= 2) {
                    user.setFirstName(parts[0]);
                    user.setLastName(parts[parts.length - 1]);
                } else {
                    user.setFirstName(fullName);
                }
            }
            
            if (profileData.get("firstName") != null) {
                user.setFirstName(profileData.get("firstName"));
            }
            
            if (profileData.get("lastName") != null) {
                user.setLastName(profileData.get("lastName"));
            }
            
            if (profileData.get("phone") != null) {
                user.setPhoneNumber(profileData.get("phone"));
            }
            
            if (profileData.get("phoneNumber") != null) {
                user.setPhoneNumber(profileData.get("phoneNumber"));
            }
            
            // Sauvegarder
            User savedUser = userRepository.save(user);
            
            log.info("✅ [RECEPTION] Profil mis à jour avec succès pour: {}", user.getUsername());
            
            // Retourner les données mises à jour
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Profil mis à jour avec succès",
                "user", Map.of(
                    "id", savedUser.getId(),
                    "firstName", savedUser.getFirstName() != null ? savedUser.getFirstName() : "",
                    "lastName", savedUser.getLastName() != null ? savedUser.getLastName() : "",
                    "phoneNumber", savedUser.getPhoneNumber() != null ? savedUser.getPhoneNumber() : "",
                    "photoUrl", savedUser.getPhotoUrl() != null ? savedUser.getPhotoUrl() : ""
                )
            ));
            
        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de la mise à jour du profil: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Erreur lors de la mise à jour du profil: " + e.getMessage()
            ));
        }
    }
    
    // ✅ CORRECTION: Méthode utilitaire pour récupérer le username depuis SecurityContextHolder
    // Cette méthode remplace l'utilisation de @AuthenticationPrincipal qui devient null avec @Transactional
    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() != null) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof String) {
                return (String) principal;
            } else if (principal instanceof UserDetails) {
                return ((UserDetails) principal).getUsername();
            }
        }
        throw new RuntimeException("Utilisateur non authentifié");
    }

    // ========================================
    // ✅ NOUVEAU: Endpoint pour les Préférences de Notifications
    // ========================================

    /**
     * PATCH /api/v1/reception/settings/preferences
     * Sauvegarde les préférences de notifications (notificationEnabled, soundEnabled, preferredLanguage)
     */
    @PatchMapping("/settings/preferences")
    @Transactional
    public ResponseEntity<?> updatePreferences(@RequestBody Map<String, Object> preferences) {
        try {
            String username = getCurrentUsername();
            log.info("⚙️ [RECEPTION] Mise à jour des préférences pour: {}", username);

            // Récupérer l'utilisateur
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            // Mettre à jour les préférences
            if (preferences.containsKey("notificationEnabled")) {
                user.setNotificationEnabled((Boolean) preferences.get("notificationEnabled"));
            }

            if (preferences.containsKey("soundEnabled")) {
                user.setSoundEnabled((Boolean) preferences.get("soundEnabled"));
            }

            if (preferences.containsKey("preferredLanguage")) {
                user.setPreferredLanguage((String) preferences.get("preferredLanguage"));
            }

            // Sauvegarder avec @DynamicUpdate pour ne pas impacter les autres champs
            User savedUser = userRepository.save(user);

            log.info("✅ [RECEPTION] Préférences mises à jour avec succès pour: {}", username);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Préférences mises à jour",
                "preferences", Map.of(
                    "notificationEnabled", savedUser.getNotificationEnabled() != null ? savedUser.getNotificationEnabled() : true,
                    "soundEnabled", savedUser.getSoundEnabled() != null ? savedUser.getSoundEnabled() : true,
                    "preferredLanguage", savedUser.getPreferredLanguage() != null ? savedUser.getPreferredLanguage() : "fr"
                )
            ));

        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de la mise à jour des préférences: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Erreur lors de la mise à jour des préférences: " + e.getMessage()
            ));
        }
    }

    /**
     * GET /api/v1/reception/settings/preferences
     * Récupère les préférences de l'utilisateur connecté
     */
    @GetMapping("/settings/preferences")
    public ResponseEntity<?> getPreferences() {
        try {
            String username = getCurrentUsername();
            log.info("📥 [RECEPTION] Récupération des préférences pour: {}", username);

            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            return ResponseEntity.ok(Map.of(
                "success", true,
                "preferences", Map.of(
                    "notificationEnabled", user.getNotificationEnabled() != null ? user.getNotificationEnabled() : true,
                    "soundEnabled", user.getSoundEnabled() != null ? user.getSoundEnabled() : true,
                    "preferredLanguage", user.getPreferredLanguage() != null ? user.getPreferredLanguage() : "fr"
                )
            ));

        } catch (Exception e) {
            log.error("❌ [RECEPTION] Erreur lors de la récupération des préférences: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Erreur lors de la récupération des préférences: " + e.getMessage()
            ));
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // ADMISSIONS QUEUE (FIX ARCHIVAGE)
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/admissions/queue-fixed")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'RECEPTION')")
    @Operation(summary = "File d'attente des admissions (filtrée sans archivés)")
    public ResponseEntity<Map<String, Object>> getAdmissionsQueueFixed(
            @RequestParam(required = false) String date) {
        try {
            log.info("📥 [RECEPTION] Récupération des admissions non archivées" + (date != null ? " pour la date: " + date : ""));

            // Utiliser la nouvelle méthode qui filtre les archivés
            List<Consultation> nonArchived = consultationRepository.findNonArchivedConsultations();
            boolean dateFilterApplied = false;

            // Filtrer par date si fournie
            if (date != null && !date.trim().isEmpty()) {
                try {
                    LocalDate filterDate = LocalDate.parse(date);
                    List<Consultation> dateFiltered = nonArchived.stream()
                            .filter(c -> {
                                LocalDate consultationDate = c.getConsultationDate() != null ?
                                    c.getConsultationDate().toLocalDate() :
                                    c.getCreatedAt().toLocalDate();
                                return consultationDate.equals(filterDate);
                            })
                            .toList();
                    log.info("📅 [RECEPTION] Filtrage par date {} : {} admission(s) trouvées", date, dateFiltered.size());
                    
                    // Si des résultats sont trouvés pour cette date, les utiliser
                    // Sinon, continuer avec toutes les admissions non archivées (dernières 24h)
                    if (!dateFiltered.isEmpty()) {
                        nonArchived = dateFiltered;
                        dateFilterApplied = true;
                    } else {
                        log.info("📅 [RECEPTION] Aucune admission pour {} → affichage des admissions récentes (7 derniers jours)", date);
                    }
                } catch (Exception e) {
                    log.warn("⚠️ [RECEPTION] Format de date invalide: {}", date);
                }
            }
            
            // Si pas de filtre de date appliqué, filtrer pour les 7 derniers jours par défaut
            if (!dateFilterApplied) {
                LocalDate sevenDaysAgo = LocalDate.now().minusDays(7);
                nonArchived = nonArchived.stream()
                        .filter(c -> {
                            LocalDate consultationDate = c.getConsultationDate() != null ?
                                c.getConsultationDate().toLocalDate() :
                                c.getCreatedAt().toLocalDate();
                            return !consultationDate.isBefore(sevenDaysAgo);
                        })
                        .toList();
                log.info("📅 [RECEPTION] Filtrage 7 derniers jours : {} admission(s)", nonArchived.size());
            }

            // Filtrer par statuts pertinents pour la caisse
            // EN_ATTENTE = nouvelles admissions réception
            // PENDING_PAYMENT = en attente paiement
            // PAYEE = déjà payées
            // ARRIVED = patient arrivé
            List<ConsultationStatus> targetStatuses = List.of(
                    ConsultationStatus.EN_ATTENTE,
                    ConsultationStatus.PENDING_PAYMENT,
                    ConsultationStatus.PAYEE,
                    ConsultationStatus.ARRIVED
            );

            List<Map<String, Object>> queue = nonArchived.stream()
                    .filter(c -> c.getStatus() != null && targetStatuses.contains(c.getStatus()))
                    .sorted(Comparator.comparing(Consultation::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .map(this::mapConsultationToQueueItem)
                    .toList();

            log.info("📋 [RECEPTION] {} admission(s) non archivées trouvées", queue.size());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "content", queue,
                    "count", queue.size()
            ));
        } catch (Exception e) {
            log.error("❌ Erreur admissions queue fixed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    private Map<String, Object> mapConsultationToQueueItem(Consultation c) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", c.getId());
        item.put("consultationId", c.getId());
        item.put("consultationCode", c.getConsultationCode());
        
        if (c.getPatient() != null) {
            item.put("patientId", c.getPatient().getId());
            item.put("patientName", c.getPatient().getFirstName() + " " + c.getPatient().getLastName());
            item.put("patientCode", c.getPatient().getPatientCode());
        }
        
        if (c.getDoctor() != null) {
            item.put("doctorName", "Dr " + c.getDoctor().getLastName());
        }
        
        item.put("status", c.getStatus() != null ? c.getStatus().name() : "UNKNOWN");
        item.put("createdAt", c.getCreatedAt());
        item.put("consultationDate", c.getConsultationDate());
        
        // Calculer le montant total - utiliser uniquement les champs existants
        BigDecimal ficheAmount = c.getFicheAmountDue() != null ? BigDecimal.valueOf(c.getFicheAmountDue()) : BigDecimal.ZERO;
        BigDecimal consulAmount = c.getConsulAmountDue() != null ? BigDecimal.valueOf(c.getConsulAmountDue()) : BigDecimal.ZERO;
        BigDecimal examAmount = c.getExamAmountPaid() != null ? c.getExamAmountPaid() : BigDecimal.ZERO;
        BigDecimal totalAmount = ficheAmount.add(consulAmount).add(examAmount);
        
        item.put("totalAmount", totalAmount);
        item.put("ficheAmount", ficheAmount);
        item.put("consulAmount", consulAmount);
        item.put("examAmount", examAmount);
        
        return item;
    }
}
