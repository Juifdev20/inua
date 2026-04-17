package com.hospital.backend.controller;

import com.hospital.backend.dto.AllLabPaymentDTO;
import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.entity.Consultation;
import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.entity.PrescribedExam;
import com.hospital.backend.entity.PrescribedExamStatus;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.ConsultationRepository;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.security.CustomUserDetails;
import com.hospital.backend.service.UltraSimpleFinanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
@Tag(name = "Finance", description = "Gestion financière de l'hôpital")
@Slf4j
public class FinanceController {

    private final UltraSimpleFinanceService financeService;
    private final ConsultationRepository consultationRepository;
    private final UserRepository userRepository;

    @GetMapping("/reports")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    @Operation(summary = "Rapports financiers")
    public ApiResponse<String> getReports() {
        return ApiResponse.success("Accès autorisé aux rapports financiers");
    }

    @GetMapping("/invoices")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    @Operation(summary = "Liste des factures")
    public ApiResponse<String> getInvoices() {
        return ApiResponse.success("Liste des factures");
    }

    @PostMapping("/pay/{consultationId}")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'RECEPTION', 'CAISSIER')")
    @Operation(summary = "Enregistrer le paiement - VERSION SIMPLIFIÉE")
    public ResponseEntity<Map<String, Object>> payConsultation(
            @PathVariable Long consultationId,
            @RequestBody(required = false) Map<String, Object> paymentData) {
        
        log.info("📥 [FINANCE CTRL] =========================================");
        log.info("📥 [FINANCE CTRL] Requête reçue - ID: {}", consultationId);
        log.info("📥 [FINANCE CTRL] Body: {}", paymentData);
        log.info("📥 [FINANCE CTRL] =========================================");
        
        try {
            // Extraire les données
            String paymentMethod = paymentData != null ? (String) paymentData.get("paymentMethod") : "ESPECES";
            Object amountObj = paymentData != null ? paymentData.get("amountPaid") : null;
            Double amountPaid = amountObj != null ? Double.valueOf(amountObj.toString()) : 0.0;
            
            Map<String, Object> result = financeService.payConsultation(consultationId, paymentMethod, amountPaid, getCurrentUserId());
            
            boolean success = Boolean.TRUE.equals(result.get("success"));
            if (success) {
                log.info("✅ [FINANCE CTRL] Paiement réussi");
                return ResponseEntity.ok(result);
            } else {
                log.error("❌ [FINANCE CTRL] Échec: {}", result.get("message"));
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            log.error("❌ [FINANCE CTRL] ERREUR CRITIQUE: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Erreur serveur: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/all-lab-payments")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'RECEPTION', 'CAISSIER')")
    @Operation(summary = "Récupérer tous les paiements laboratoire avec filtre optionnel par date")
    public ResponseEntity<Map<String, Object>> getAllLabPayments(
            @RequestParam(required = false) String date) {
        
        log.info("📥 [FINANCE CTRL] Récupération des paiements laboratoire - Date: {}", date);

        try {
            List<ConsultationStatus> targetStatuses = List.of(
                ConsultationStatus.EN_ATTENTE,
                ConsultationStatus.EXAMENS_PRESCRITS,
                ConsultationStatus.PAYEE,
                ConsultationStatus.AU_LABO,
                ConsultationStatus.EXAMENS_PAYES
            );

            List<Consultation> consultations;
            boolean dateFilterApplied = false;
            
            // Si une date est fournie, filtrer par cette date
            if (date != null && !date.isEmpty()) {
                try {
                    LocalDate targetDate = LocalDate.parse(date);
                    LocalDateTime startOfDay = targetDate.atStartOfDay();
                    LocalDateTime endOfDay = targetDate.atTime(23, 59, 59);
                    
                    List<Consultation> dateFiltered = consultationRepository
                        .findByStatusInAndCreatedAtBetweenWithPatientDoctorAndExams(
                            targetStatuses, startOfDay, endOfDay);
                    
                    log.info("📅 [FINANCE CTRL] Filtrage par date: {} - {} consultations trouvées", 
                        date, dateFiltered.size());
                    
                    // Si des résultats sont trouvés pour cette date, les utiliser
                    // Sinon, fallback sur les 7 derniers jours
                    if (!dateFiltered.isEmpty()) {
                        consultations = dateFiltered;
                        dateFilterApplied = true;
                    } else {
                        log.info("📅 [FINANCE CTRL] Aucun résultat pour {} → fallback sur 7 derniers jours", date);
                        consultations = List.of(); // Initialiser pour le fallback ci-dessous
                    }
                } catch (Exception e) {
                    log.warn("⚠️ [FINANCE CTRL] Format de date invalide: {}", date);
                    consultations = List.of();
                }
            } else {
                consultations = List.of(); // Initialiser pour le fallback ci-dessous
            }
            
            // Fallback: si pas de filtre date appliqué ou résultats vides → 7 derniers jours
            if (!dateFilterApplied || consultations.isEmpty()) {
                LocalDate sevenDaysAgo = LocalDate.now().minusDays(7);
                LocalDateTime startOfPeriod = sevenDaysAgo.atStartOfDay();
                LocalDateTime endOfPeriod = LocalDate.now().atTime(23, 59, 59);
                
                consultations = consultationRepository
                    .findByStatusInAndCreatedAtBetweenWithPatientDoctorAndExams(
                        targetStatuses, startOfPeriod, endOfPeriod);
                
                log.info("📋 [FINANCE CTRL] {} consultations trouvées (7 derniers jours)", 
                    consultations.size());
            }

            // Filtrer uniquement celles qui ont des examens prescrits
            List<Consultation> withExams = consultations.stream()
                .filter(c -> c.getPrescribedExams() != null && !c.getPrescribedExams().isEmpty())
                .collect(Collectors.toList());

            log.info("📋 [FINANCE CTRL] {} consultations avec examens non vides", withExams.size());

            // Mapper en DTO
            List<AllLabPaymentDTO> labPayments = withExams.stream()
                .map(this::mapToAllLabPaymentDTO)
                .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", labPayments,
                "message", "Liste des paiements laboratoire"
            ));
        } catch (Exception e) {
            log.error("❌ [FINANCE CTRL] Erreur: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Erreur: " + e.getMessage()
            ));
        }
    }
    
    private AllLabPaymentDTO mapToAllLabPaymentDTO(Consultation c) {
        // ★ CORRECTION: Ne prendre que les examens ACTIFS de cette consultation
        List<PrescribedExam> activeExams = c.getPrescribedExams().stream()
            .filter(exam -> exam.getActive() != null && exam.getActive())
            .filter(exam -> exam.getStatus() != PrescribedExamStatus.CANCELLED)
            .collect(Collectors.toList());
        
        BigDecimal examTotal = activeExams.stream()
            .map(PrescribedExam::getTotalPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
            
        BigDecimal examPaid = c.getExamAmountPaid() != null ? c.getExamAmountPaid() : BigDecimal.ZERO;
        BigDecimal remaining = examTotal.subtract(examPaid);
        
        List<AllLabPaymentDTO.PrescribedExamDTO> exams = activeExams.stream()
            .map(exam -> AllLabPaymentDTO.PrescribedExamDTO.builder()
                .id(exam.getId())
                .serviceId(exam.getService() != null ? exam.getService().getId() : null)
                .serviceName(exam.getService() != null ? exam.getService().getNom() : exam.getServiceName())
                .unitPrice(exam.getUnitPrice())
                .quantity(exam.getQuantity())
                .totalPrice(exam.getTotalPrice())
                .doctorNote(exam.getDoctorNote())
                .cashierNote(exam.getCashierNote())
                .active(exam.getActive())
                .status(exam.getStatus() != null ? exam.getStatus().name() : "PENDING")
                // ★ NOUVEAU: Champs résultats laboratoire
                .resultValue(exam.getResultValue())
                .unit(exam.getUnit())
                .referenceRangeText(exam.getReferenceRangeText())
                .isCritical(exam.getIsCritical())
                .labComment(exam.getLabComment())
                .build())
            .collect(Collectors.toList());
        
        return AllLabPaymentDTO.builder()
            .id(c.getId())
            .consultationId(c.getId())
            .patientId(c.getPatient() != null ? c.getPatient().getId() : null)
            .patientName(c.getPatient() != null ? c.getPatient().getFirstName() + " " + c.getPatient().getLastName() : "Patient inconnu")
            .patientCode(c.getPatient() != null ? c.getPatient().getPatientCode() : null)
            .consultationCode("REF-" + c.getId())
            .status(c.getStatus() != null ? c.getStatus().name() : "EN_ATTENTE")
            .createdAt(c.getCreatedAt())
            .consultationDate(c.getConsultationDate())
            .examTotalAmount(examTotal)
            .examAmountPaid(examPaid)
            .remainingAmount(remaining)
            .prescribedExams(exams)
            .doctorName(c.getDoctor() != null ? c.getDoctor().getFirstName() + " " + c.getDoctor().getLastName() : null)
            .build();
    }

    @PostMapping("/consultations/{consultationId}/send-to-lab")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'RECEPTION', 'CAISSIER')")
    @Operation(summary = "Envoyer les examens au laboratoire après paiement")
    public ResponseEntity<Map<String, Object>> sendToLab(
            @PathVariable Long consultationId) {
        
        log.info("📤 [FINANCE CTRL] Envoi au laboratoire - Consultation: {}", consultationId);
        
        try {
            Optional<Consultation> opt = consultationRepository.findById(consultationId);
            if (opt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Consultation non trouvée"
                ));
            }
            
            Consultation c = opt.get();
            c.setStatus(ConsultationStatus.AU_LABO);
            consultationRepository.save(c);
            
            log.info("✅ [FINANCE CTRL] Consultation {} envoyée au labo", consultationId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Examen envoyé au laboratoire",
                "consultationId", consultationId,
                "status", "AU_LABO"
            ));
            
        } catch (Exception e) {
            log.error("❌ [FINANCE CTRL] ERREUR envoi labo: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Erreur: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/admissions/{admissionId}/send-to-doctor")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'RECEPTION', 'CAISSIER')")
    @Operation(summary = "Envoyer l'admission au docteur après paiement")
    public ResponseEntity<Map<String, Object>> sendToDoctor(
            @PathVariable Long admissionId) {
        
        log.info("📤 [FINANCE CTRL] Envoi au docteur - Admission: {}", admissionId);
        
        try {
            // Récupérer la consultation associée à l'admission
            Map<String, Object> result = financeService.sendToDoctor(admissionId);
            
            boolean success = Boolean.TRUE.equals(result.get("success"));
            if (success) {
                log.info("✅ [FINANCE CTRL] Envoyé au docteur avec succès");
                return ResponseEntity.ok(result);
            } else {
                log.error("❌ [FINANCE CTRL] Échec envoi: {}", result.get("message"));
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            log.error("❌ [FINANCE CTRL] ERREUR envoi docteur: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Erreur lors de l'envoi au docteur: " + e.getMessage()
            ));
        }
    }

    private Long getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
                CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
                return userDetails.getUser().getId();
            }
            String username = auth != null ? auth.getName() : null;
            if (username != null) {
                return userRepository.findByUsername(username)
                    .map(User::getId)
                    .orElse(1L);
            }
        } catch (Exception e) {
            log.warn("⚠️ Impossible de récupérer l'ID utilisateur: {}", e.getMessage());
        }
        return 1L;
    }
}
