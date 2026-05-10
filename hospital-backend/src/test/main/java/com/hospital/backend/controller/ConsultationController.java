package com.hospital.backend.controller;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.ConsultationStatus;
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

@RestController
@RequestMapping("/api/v1/consultations")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Consultations", description = "Gestion des consultations médicales")
@CrossOrigin(origins = "*")
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

    // --- ✅ NOUVELLE MÉTHODE : AGENDA (RECHERCHE PAR DATE) ---

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

    // --- ✅ NOUVELLE MÉTHODE : ACTION ARCHIVER ---

    @PutMapping("/{id}/archive")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    @Operation(summary = "Archiver une consultation", description = "Change le statut d'une consultation en ARCHIVED")
    public ResponseEntity<ApiResponse<ConsultationDTO>> archiveConsultation(@PathVariable Long id) {
        log.info("Demande d'archivage pour la consultation ID: {}", id);
        ConsultationDTO archived = consultationService.archiveConsultation(id);
        return ResponseEntity.ok(ApiResponse.success("Consultation archivée avec succès", archived));
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
    @Operation(summary = "Obtenir une consultation par son ID")
    public ResponseEntity<ApiResponse<ConsultationDTO>> getById(@PathVariable Long id) {
        ConsultationDTO consultation = consultationService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(consultation));
    }

    @GetMapping("/code/{code}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION', 'ROLE_PATIENT')")
    @Operation(summary = "Recherche par code de consultation")
    public ResponseEntity<ApiResponse<ConsultationDTO>> getByCode(@PathVariable String code) {
        ConsultationDTO consultation = consultationService.getByCode(code);
        return ResponseEntity.ok(ApiResponse.success(consultation));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION', 'ROLE_PATIENT')")
    public ResponseEntity<ApiResponse<PageResponse<ConsultationDTO>>> getAll(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<ConsultationDTO> consultations = consultationService.getAll(pageable);
        return ResponseEntity.ok(ApiResponse.success(consultations));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION', 'ROLE_PATIENT')")
    public ResponseEntity<ApiResponse<PageResponse<ConsultationDTO>>> getByStatus(
            @PathVariable ConsultationStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        PageResponse<ConsultationDTO> consultations = consultationService.getByStatus(status, pageable);
        return ResponseEntity.ok(ApiResponse.success(consultations));
    }

    // --- MISES À JOUR ---

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION', 'ROLE_LABO', 'ROLE_PHARMACIE')")
    public ResponseEntity<ApiResponse<ConsultationDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody ConsultationDTO consultationDTO) {
        ConsultationDTO updated = consultationService.update(id, consultationDTO);
        return ResponseEntity.ok(ApiResponse.success("Fiche mise à jour", updated));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR', 'ROLE_RECEPTION')")
    public ResponseEntity<ApiResponse<ConsultationDTO>> updateStatus(
            @PathVariable Long id,
            @RequestParam("status") String statusStr) {
        try {
            if (statusStr == null || statusStr.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Le statut ne peut pas être vide"));
            }
            ConsultationStatus status = ConsultationStatus.valueOf(statusStr.toUpperCase());
            ConsultationDTO updated = consultationService.updateStatus(id, status);
            return ResponseEntity.ok(ApiResponse.success("Statut mis à jour", updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Statut non reconnu : " + statusStr));
        }
    }

    @PostMapping("/{id}/send-to-lab")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<ApiResponse<ConsultationDTO>> sendToLab(@PathVariable Long id) {
        ConsultationDTO updated = consultationService.sendToLab(id);
        return ResponseEntity.ok(ApiResponse.success("Patient envoyé au laboratoire", updated));
    }

    @PostMapping("/{id}/send-to-pharmacy")
    @PreAuthorize("hasAuthority('ROLE_DOCTEUR')")
    public ResponseEntity<ApiResponse<ConsultationDTO>> sendToPharmacy(@PathVariable Long id) {
        ConsultationDTO updated = consultationService.sendToPharmacy(id);
        return ResponseEntity.ok(ApiResponse.success("Patient envoyé à la pharmacie", updated));
    }

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

    // --- SUPPRESSION / ANNULATION ---

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_PATIENT', 'ROLE_DOCTEUR')")
    @Operation(summary = "Annuler ou supprimer une consultation")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        log.info("Demande de suppression/annulation de la consultation ID: {}", id);
        consultationService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Rendez-vous supprimé ou annulé avec succès", null));
    }
}