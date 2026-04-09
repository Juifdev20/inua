package com.hospital.backend.controller;

import com.hospital.backend.dto.*;
import com.hospital.backend.dto.FinaliserConsultationRequest;
import com.hospital.backend.dto.PatientJourneyDTO;
import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.service.ConsultationService;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/consultations")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Consultations", description = "Gestion des consultations médicales")
@CrossOrigin(origins = {"https://inua-oux2.onrender.com", "https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class ConsultationController {

    private final ConsultationService consultationService;

    // --- ✅ MÉTHODE : HISTORIQUE RÉEL POUR LE DOCTEUR ---

    @GetMapping("/doctor/{doctorId}/history")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    @Operation(summary = "Historique réel du docteur", description = "Récupère les consultations terminées ou annulées d'un docteur spécifique")
    public ResponseEntity<ApiResponse<PageResponse<ConsultationDTO>>> getDoctorHistory(
            @PathVariable Long doctorId,
            @PageableDefault(size = 10, sort = "consultationDate", direction = Sort.Direction.DESC) Pageable pageable) {

        log.info("Récupération de l'historique réel pour le docteur ID: {}", doctorId);
        PageResponse<ConsultationDTO> history = consultationService.getDoctorHistory(doctorId, pageable);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    // --- ✅ MÉTHODE : HISTORIQUE POUR UN PATIENT (NÉCESSAIRE POUR DOSSIER PATIENT) ---

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR')")
    @Operation(summary = "Historique complet d'un patient", description = "Récupère toutes les consultations d'un patient spécifique pour son dossier")
    public ResponseEntity<ApiResponse<List<ConsultationDTO>>> getPatientHistory(@PathVariable Long patientId) {
        log.info("Récupération de l'historique médical pour le patient ID: {}", patientId);
        List<ConsultationDTO> history = consultationService.getHistoryByPatientId(patientId);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    // --- ✅ MÉTHODE : AGENDA (RECHERCHE PAR DATE) ---

    @GetMapping("/doctor/{doctorId}/appointments")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    @Operation(summary = "Agenda du docteur par date", description = "Récupère les rendez-vous pour un jour précis")
    public ResponseEntity<ApiResponse<List<ConsultationDTO>>> getAppointmentsByDate(
            @PathVariable Long doctorId,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        log.info("Récupération de l'agenda pour le docteur ID: {} à la date: {}", doctorId, date);
        List<ConsultationDTO> appointments = consultationService.getDoctorAppointmentsByDate(doctorId, date);
        return ResponseEntity.ok(ApiResponse.success(appointments));
    }

    // --- ✅ MÉTHODE : ACTION ARCHIVER ---

    @PutMapping("/{id}/archive")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTEUR', 'ROLE_RECEPTION', 'ROLE_ADMIN')")
    @Operation(summary = "Archiver une consultation", description = "Change le statut d'une consultation en ARCHIVED")
    public ResponseEntity<ApiResponse<ConsultationDTO>> archiveConsultation(@PathVariable Long id) {
        log.info("Demande d'archivage pour la consultation ID: {}", id);
        ConsultationDTO archived = consultationService.archiveConsultation(id);
        return ResponseEntity.ok(ApiResponse.success("Consultation archivée avec succès", archived));
    }

    @GetMapping("/filter")
    @PreAuthorize("hasAnyAuthority('ROLE_RECEPTION', 'ROLE_ADMIN', 'ROLE_DOCTEUR')")
    public ResponseEntity<Map<String, Object>> getConsultations(
            @RequestParam(required = false) String statut) {

        log.info("🔍 [CONSULTATION] Récupération des consultations - statut: {}", statut);

        try {
            List<com.hospital.backend.dto.ConsultationDTO> consultations;

            if (statut != null && !statut.isEmpty()) {
                consultations = consultationService.findByStatut(statut);
                log.info("✅ [CONSULTATION] {} consultations trouvées avec statut: {}", consultations.size(), statut);
            } else {
                consultations = consultationService.getAllConsultations();
                log.info("✅ [CONSULTATION] {} consultations trouvées (toutes)", consultations.size());
            }

            List<Map<String, Object>> response = consultations.stream()
                    .map(dto -> {
                        Map<String, Object> item = new java.util.HashMap<>();
                        item.put("id", dto.getId());
                        item.put("patientName", dto.getPatientName());
                        item.put("patientPhoto", dto.getPatientPhoto());
                        item.put("doctorName", dto.getDoctorName());
                        item.put("statut", dto.getStatut());
                        item.put("status", dto.getStatus());
                        item.put("motif", dto.getReasonForVisit());
                        item.put("createdAt", dto.getCreatedAt());
                        item.put("exams", dto.getExams());
                        return item;
                    })
                    .collect(java.util.stream.Collectors.toList());

            Map<String, Object> result = Map.of("content", response);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("❌ [CONSULTATION] Erreur lors de la récupération des consultations: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // --- RÉCUPÉRATION POUR LE PATIENT CONNECTÉ ---

    @GetMapping("/my-appointments")
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    @Operation(summary = "Mes rendez-vous (Patient)", description = "Récupère la liste complète des rendez-vous du patient actuellement connecté")
    public ResponseEntity<ApiResponse<List<ConsultationDTO>>> getMyAppointments(Principal principal) {
        log.info("Récupération des rendez-vous pour le patient connecté: {}", principal.getName());
        List<ConsultationDTO> consultations = consultationService.getConsultationsForCurrentPatient(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(consultations));
    }

    // --- MÉTHODES DE CRÉATION ---

    @PostMapping("/book")
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    @Operation(summary = "Prendre rendez-vous (Patient)")
    public ResponseEntity<ApiResponse<ConsultationDTO>> bookAppointment(
            @Valid @RequestBody ConsultationDTO consultationDTO,
            Principal principal) {
        log.info("Demande de RDV par le patient: {}", principal.getName());
        ConsultationDTO created = consultationService.createAppointmentForPatient(consultationDTO, principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Votre rendez-vous a été réservé avec succès", created));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION')")
    @Operation(summary = "Créer une fiche physique (Réception)")
    public ResponseEntity<ApiResponse<ConsultationDTO>> create(@Valid @RequestBody ConsultationDTO consultationDTO) {
        log.info("Réception: Création d'une fiche pour le patient ID: {}", consultationDTO.getPatientId());
        ConsultationDTO created = consultationService.create(consultationDTO);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Consultation créée avec succès", created));
    }

    // --- ACTIONS PATIENT ---

    @PutMapping("/{id}/accept-reschedule")
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    @Operation(summary = "Le patient accepte une proposition de report")
    public ResponseEntity<ApiResponse<ConsultationDTO>> acceptReschedule(@PathVariable Long id) {
        log.info("Requête PUT reçue : Patient accepte le report pour l'ID: {}", id);
        try {
            ConsultationDTO updated = consultationService.acceptReschedule(id);
            return ResponseEntity.ok(ApiResponse.success("Nouveau créneau confirmé avec succès", updated));
        } catch (Exception e) {
            log.error("Erreur lors de l'acceptation du report pour ID {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Impossible de confirmer ce créneau : " + e.getMessage()));
        }
    }

    // --- ACTION : DÉCISION DOCTEUR ---

    @PostMapping("/{id}/decide")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    @Operation(summary = "Le docteur valide, rejette ou reporte un RDV")
    public ResponseEntity<ApiResponse<ConsultationDTO>> decideConsultation(
            @PathVariable Long id,
            @Valid @RequestBody DecisionRequest decisionRequest) {
        log.info("DÉCISION DOCTEUR - ID: {} | Statut: {} | Motif: {}", id, decisionRequest.getStatus(), decisionRequest.getDecisionNote());
        ConsultationDTO updated = consultationService.processDoctorDecision(id, decisionRequest);
        return ResponseEntity.ok(ApiResponse.success("Décision enregistrée et profil patient mis à jour", updated));
    }

    // --- ACTIONS DE PRISE EN CHARGE ---

    @PatchMapping("/{id}/start")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    @Operation(summary = "Prendre en charge la consultation (Démarrer)")
    public ResponseEntity<ApiResponse<ConsultationDTO>> startConsultation(@PathVariable Long id) {
        log.info("Le docteur prend en charge la consultation ID: {}", id);
        ConsultationDTO updated = consultationService.startConsultation(id);
        return ResponseEntity.ok(ApiResponse.success("Consultation démarrée", updated));
    }

    // --- RÉCUPÉRATION ET RECHERCHE ---

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION', 'ROLE_PATIENT')")
    @Operation(summary = "Récupérer une consultation par ID")
    public ResponseEntity<ApiResponse<ConsultationDTO>> getById(@PathVariable Long id) {
        log.info("Récupération de la consultation ID: {}", id);
        ConsultationDTO dto = consultationService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @GetMapping("/code/{code}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION', 'ROLE_PATIENT')")
    @Operation(summary = "Recherche par code de consultation")
    public ResponseEntity<ApiResponse<ConsultationDTO>> getByCode(@PathVariable String code) {
        ConsultationDTO consultation = consultationService.getByCode(code);
        return ResponseEntity.ok(ApiResponse.success(consultation));
    }

    // --- DASHBOARD DOCTEUR : Consultations EN_ATTENTE ---
    @GetMapping("/doctor/{doctorId}/dashboard")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    @Operation(summary = "Dashboard du docteur", description = "Consultations EN_ATTENTE avec détails patient et signes vitaux")
    public ResponseEntity<ApiResponse<List<ConsultationDTO>>> getDoctorDashboard(@PathVariable Long doctorId) {
        log.info("Dashboard docteur : consultations EN_ATTENTE pour le docteur {}", doctorId);
        List<ConsultationDTO> rdvs = consultationService.getByStatus(ConsultationStatus.EN_ATTENTE, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(c -> c.getDoctorId() != null && c.getDoctorId().equals(doctorId))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(rdvs));
    }

    // --- GET ALL (inclut exams, examAmountPaid, etc.) ---
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION', 'ROLE_PATIENT')")
    public ResponseEntity<ApiResponse<PageResponse<ConsultationDTO>>> getAll(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<ConsultationDTO> consultations = consultationService.getAll(pageable);
        return ResponseEntity.ok(ApiResponse.success(consultations));
    }

    // --- UPDATE (PUT) : Sécurité sur les signes vitaux ---
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION', 'ROLE_LABO', 'ROLE_PHARMACIE')")
    public ResponseEntity<ApiResponse<ConsultationDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody ConsultationDTO consultationDTO,
            Principal principal) {
        log.info("Mise à jour consultation ID: {} par {}", id, principal != null ? principal.getName() : "système");
        ConsultationDTO updated = consultationService.update(id, consultationDTO);
        return ResponseEntity.ok(ApiResponse.success("Fiche mise à jour", updated));
    }

    // ✅ MÉTHODE CORRIGÉE POUR LA RESTAURATION ET MISE À JOUR DE STATUT
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION')")
    @Operation(summary = "Mettre à jour le statut (ou restaurer)", description = "Accepte le statut via paramètre d'URL (?status=...) ou via corps JSON")
    public ResponseEntity<ApiResponse<ConsultationDTO>> updateStatus(
            @PathVariable Long id,
            @RequestParam(value = "status", required = false) String statusStr,
            @RequestBody(required = false) Map<String, String> body) {

        try {
            String finalStatusName = statusStr;
            if (finalStatusName == null && body != null && body.containsKey("status")) {
                finalStatusName = body.get("status");
            }

            if (finalStatusName == null || finalStatusName.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Le statut ne peut pas être vide"));
            }

            log.info("Traitement mise à jour statut pour ID {}: {}", id, finalStatusName);
            ConsultationStatus status = ConsultationStatus.valueOf(finalStatusName.toUpperCase().trim());
            ConsultationDTO updated = consultationService.updateStatus(id, status);

            return ResponseEntity.ok(ApiResponse.success("Statut mis à jour avec succès", updated));

        } catch (IllegalArgumentException e) {
            log.error("Statut invalide envoyé: {}", statusStr);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Le statut '" + statusStr + "' n'existe pas dans le système."));
        } catch (Exception e) {
            log.error("Erreur lors de la mise à jour du statut: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur serveur lors de la mise à jour."));
        }
    }

    // ✅ SUPPRIMÉ : send-to-lab dupliqué - utilisez /api/v1/finance/consultations/{id}/send-to-lab
    // ✅ SUPPRIMÉ : send-to-pharmacy dupliqué - à déplacer dans FinanceController si besoin

    // --- EXPORT PDF ---

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION', 'ROLE_PATIENT')")
    public ResponseEntity<byte[]> generateConsultationPDF(@PathVariable Long id) {
        try {
            ConsultationDTO dto = consultationService.getById(id);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, baos);

            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.BLACK);
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.DARK_GRAY);
            Font textFont = FontFactory.getFont(FontFactory.HELVETICA, 12, Color.BLACK);

            Paragraph title = new Paragraph("FICHE DE CONSULTATION", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            document.add(new Paragraph("Code Consultation: " + dto.getConsultationCode(), labelFont));
            document.add(new Paragraph("Patient: " + dto.getPatientName(), textFont));
            document.add(new Paragraph("Médecin: Dr. " + dto.getDoctorName(), textFont));
            document.add(new Paragraph("Date: " + dto.getFormattedDate(), textFont));
            document.add(new Paragraph("Motif: " + (dto.getReasonForVisit() != null ? dto.getReasonForVisit() : "N/A"), textFont));

            if (dto.getPoids() != null) document.add(new Paragraph("Poids: " + dto.getPoids(), textFont));
            if (dto.getTensionArterielle() != null) document.add(new Paragraph("Tension: " + dto.getTensionArterielle(), textFont));

            document.close();
            byte[] pdfBytes = baos.toByteArray();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDisposition(ContentDisposition.inline()
                    .filename("Consultation-" + dto.getConsultationCode() + ".pdf").build());

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Erreur génération PDF pour consultation {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // --- ADMISSION MANAGEMENT ---

    @PostMapping("/{id}/admission")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION')")
    @Operation(summary = "Lier ou créer une admission", description = "Crée une nouvelle admission ou lie une existante à la consultation")
    public ResponseEntity<ApiResponse<ConsultationDTO>> linkOrCreateAdmission(
            @PathVariable Long id,
            @RequestBody(required = false) AdmissionDTO admissionDTO) {
        log.info("Lien/Création admission pour la consultation ID: {}", id);
        try {
            ConsultationDTO updated = consultationService.linkOrCreateAdmission(id, admissionDTO);
            return ResponseEntity.ok(ApiResponse.success("Admission liée avec succès", updated));
        } catch (Exception e) {
            log.error("Erreur lors de la liaison de l'admission: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/create-admission")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR')")
    @Operation(summary = "Crée une admission pour une consultation", description = "Crée automatiquement une admission avec les données de la consultation")
    public ResponseEntity<ApiResponse<ConsultationDTO>> createAdmissionForConsultation(@PathVariable Long id) {
        log.info("Création automatique d'admission pour la consultation ID: {}", id);
        try {
            ConsultationDTO updated = consultationService.linkOrCreateAdmission(id, null);
            return ResponseEntity.ok(ApiResponse.success("Admission créée avec succès", updated));
        } catch (Exception e) {
            log.error("Erreur lors de la création de l'admission: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}/check-admission")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR')")
    @Operation(summary = "Vérifie si une consultation a une admission", description = "Retourne les détails de la consultation avec admissionId")
    public ResponseEntity<ApiResponse<ConsultationDTO>> checkAdmissionStatus(@PathVariable Long id) {
        log.info("Vérification du statut d'admission pour la consultation ID: {}", id);
        try {
            ConsultationDTO consultation = consultationService.getById(id);
            return ResponseEntity.ok(ApiResponse.success("Statut vérifié", consultation));
        } catch (Exception e) {
            log.error("Erreur lors de la vérification: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur: " + e.getMessage()));
        }
    }

    // --- ✅ FINALISER CONSULTATION AVEC PRESCRIPTION ---

    @PostMapping("/{id}/finaliser")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTEUR', 'ROLE_ADMIN')")
    @Operation(summary = "Finaliser une consultation avec prescription", description = "Enregistre l'ordonnance et change le statut en TREATED")
    public ResponseEntity<ApiResponse<ConsultationDTO>> finaliserConsultation(
            @PathVariable Long id,
            @RequestBody FinaliserConsultationRequest request) {
        log.info("📋 Finalisation de la consultation ID: {} avec prescription", id);
        try {
            if (request == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Données de requête invalides"));
            }
            ConsultationDTO finalized = consultationService.finaliserConsultation(id, request);
            return ResponseEntity.ok(ApiResponse.success("Consultation finalisée avec succès", finalized));
        } catch (ResourceNotFoundException e) {
            log.error("Consultation non trouvée: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.error("Données invalides: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Données invalides: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur lors de la finalisation: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur serveur: " + e.getMessage()));
        }
    }

    // --- ✅ DOSSIER PATIENT COMPLET ---

    @GetMapping("/{id}/patient-journey")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_PATIENT')")
    @Operation(summary = "Générer le dossier patient complet", description = "Retourne le parcours complet : Triage, Labo, Prescription, Pharmacie, Finance")
    public ResponseEntity<ApiResponse<PatientJourneyDTO>> getPatientJourney(@PathVariable Long id) {
        log.info("📋 Génération du dossier patient complet pour consultation ID: {}", id);
        try {
            PatientJourneyDTO journey = consultationService.getPatientJourney(id);
            return ResponseEntity.ok(ApiResponse.success("Dossier patient généré avec succès", journey));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur lors de la génération du dossier: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur serveur: " + e.getMessage()));
        }
    }

    // --- MIGRATION DATA ---

    @PostMapping("/migrate-admissions")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Migrer les consultations sans admission", description = "Crée automatiquement des admissions pour les consultations existantes")
    public ResponseEntity<ApiResponse<String>> migrateConsultationsWithoutAdmission() {
        log.info("🚀 Déclenchement de la migration des admissions depuis l'API");
        try {
            consultationService.migrateConsultationsWithoutAdmission();
            return ResponseEntity.ok(ApiResponse.success("Migration des admissions terminée avec succès"));
        } catch (Exception e) {
            log.error("Erreur lors de la migration: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur lors de la migration: " + e.getMessage()));
        }
    }

    // --- SUPPRESSION / ANNULATION ---

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_PATIENT', 'ROLE_DOCTEUR', 'ROLE_RECEPTION')")
    @Operation(summary = "Annuler ou supprimer une consultation (Soft Delete)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        log.info("Demande de suppression/annulation de la consultation ID: {}", id);
        consultationService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Rendez-vous supprimé ou annulé avec succès", null));
    }
}