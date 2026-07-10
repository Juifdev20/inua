package com.hospital.backend.controller;

import com.hospital.backend.dto.AllLabPaymentDTO;
import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.dto.ConsultationDTO;
import com.hospital.backend.dto.PharmacyOrderDTO;
import com.hospital.backend.entity.Admission;
import com.hospital.backend.entity.Consultation;
import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.entity.PharmacyOrderStatus;
import com.hospital.backend.entity.PrescribedExam;
import com.hospital.backend.entity.PrescribedExamStatus;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.ConsultationRepository;
import com.hospital.backend.repository.PharmacyOrderRepository;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.security.CustomUserDetails;
import com.hospital.backend.security.HospitalTenantContext;
import com.hospital.backend.entity.MedicalService;
import com.hospital.backend.entity.Examen;
import com.hospital.backend.repository.MedicalServiceRepository;
import com.hospital.backend.repository.ExamenRepository;
import com.hospital.backend.service.ConsultationService;
import com.hospital.backend.service.LabAlertService;
import com.hospital.backend.service.PharmacyService;
import com.hospital.backend.service.UltraSimpleFinanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
@Tag(name = "Finance", description = "Gestion financière de l'hôpital")
@CrossOrigin(origins = {"https://inua-oux2.onrender.com", "https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
@Slf4j
public class FinanceController {

    private final UltraSimpleFinanceService financeService;
    private final ConsultationService consultationService;
    private final ConsultationRepository consultationRepository;
    private final UserRepository userRepository;
    private final MedicalServiceRepository medicalServiceRepository;
    private final ExamenRepository examenRepository;
    private final PharmacyService pharmacyService;
    private final PharmacyOrderRepository pharmacyOrderRepository;
    private final LabAlertService labAlertService;

    @GetMapping("/reports")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    @Operation(summary = "Rapports financiers")
    public ApiResponse<String> getReports() {
        return ApiResponse.success("Accès autorisé aux rapports financiers");
    }

    @GetMapping("/admissions/queue")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'RECEPTION', 'CAISSIER')")
    @Operation(summary = "File d'attente des admissions pour la caisse")
    public ResponseEntity<Map<String, Object>> getAdmissionsQueue(
            @RequestParam(required = false) String date) {
        log.info("📋 [FINANCE] Récupération file d'attente admissions - Date: {}", date);
        Map<String, Object> result = financeService.getAdmissionsQueue(date);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/finance/services
     * Récupère tous les services médicaux + examens laboratoire pour la grille tarifaire (Finance)
     */
    @GetMapping("/services")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    @Operation(summary = "Liste des services médicaux et examens laboratoire (grille tarifaire)")
    public ResponseEntity<Map<String, Object>> getAllMedicalServices() {
        try {
            Long hId = HospitalTenantContext.getHospitalId();
            List<MedicalService> services = (hId != null)
                    ? medicalServiceRepository.findByHospitalIdAndIsActiveTrue(hId)
                    : medicalServiceRepository.findByIsActiveTrue();
            List<Examen> examens = (hId != null)
                    ? examenRepository.findByHospitalIdAndActifTrue(hId)
                    : examenRepository.findByActifTrue();

            // Convertir MedicalServices
            List<Map<String, Object>> result = services.stream()
                    .map(s -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", s.getId());
                        map.put("name", s.getNom() != null ? s.getNom() : "");
                        map.put("description", s.getDescription() != null ? s.getDescription() : "");
                        map.put("category", s.getDepartement() != null ? s.getDepartement() : "");
                        map.put("price", s.getPrix());
                        map.put("currency", s.getCurrency() != null ? s.getCurrency().name() : "USD");
                        map.put("duration", s.getDuree());
                        map.put("active", s.getIsActive() != null ? s.getIsActive() : true);
                        map.put("type", "SERVICE");
                        return map;
                    })
                    .collect(Collectors.toList());

            // ✅ Ajouter les examens de laboratoire avec ID négatif pour les distinguer
            List<Map<String, Object>> examenList = examens.stream()
                    .map(e -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", -e.getId()); // ID négatif pour distinguer des services
                        map.put("name", e.getNom() != null ? e.getNom() : "");
                        map.put("description", e.getDescription() != null ? e.getDescription() : "");
                        map.put("category", "Laboratoire");
                        map.put("price", e.getPrix() != null ? e.getPrix().doubleValue() : 0.0);
                        map.put("currency", "USD");
                        map.put("duration", e.getDelaiResultatHeures());
                        map.put("active", e.getActif() != null ? e.getActif() : true);
                        map.put("type", "EXAMEN");
                        map.put("code", e.getCode());
                        map.put("unite", e.getUnite());
                        return map;
                    })
                    .collect(Collectors.toList());

            result.addAll(examenList);

            // Trier par nom
            result.sort((a, b) -> ((String) a.get("name")).compareToIgnoreCase((String) b.get("name")));

            log.info("📋 [FINANCE] {} services et {} examens laboratoire récupérés (total: {})",
                    services.size(), examens.size(), result.size());
            Map<String, Object> successResponse = new HashMap<>();
            successResponse.put("success", true);
            successResponse.put("content", result);
            successResponse.put("total", result.size());
            successResponse.put("servicesCount", services.size());
            successResponse.put("examensCount", examens.size());
            return ResponseEntity.ok(successResponse);
        } catch (Exception e) {
            log.error("❌ [FINANCE] Erreur récupération services: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage() != null ? e.getMessage() : "Unknown error");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * GET /api/finance/tarifs
     * Alias pour /services - compatibilité avec l'ancien frontend
     */
    @GetMapping("/tarifs")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    @Operation(summary = "Alias: liste des services médicaux")
    public ResponseEntity<Map<String, Object>> getAllTarifs() {
        return getAllMedicalServices();
    }

    @PostMapping("/services")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Créer un service médical (Admin uniquement)")
    public ResponseEntity<Map<String, Object>> createMedicalService(@RequestBody MedicalService service) {
        try {
            if (service.getIsActive() == null) service.setIsActive(true);
            Long hId = HospitalTenantContext.getHospitalId();
            if (hId != null) {
                service.setHospital(com.hospital.backend.entity.Hospital.builder().id(hId).build());
            }
            MedicalService saved = medicalServiceRepository.save(service);
            log.info("✅ [FINANCE] Service créé: {} ({})", saved.getNom(), saved.getId());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "content", saved,
                    "message", "Service créé avec succès"
            ));
        } catch (Exception e) {
            log.error("❌ [FINANCE] Erreur création service: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage() != null ? e.getMessage() : "Unknown error");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PutMapping("/services/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Modifier un service médical (Admin uniquement)")
    public ResponseEntity<Map<String, Object>> updateMedicalService(@PathVariable Long id, @RequestBody MedicalService details) {
        return medicalServiceRepository.findById(id).map(s -> {
            s.setNom(details.getNom());
            s.setDescription(details.getDescription());
            s.setPrix(details.getPrix());
            s.setCurrency(details.getCurrency());
            s.setDuree(details.getDuree());
            s.setDepartement(details.getDepartement());
            s.setIsActive(details.getIsActive());
            MedicalService updated = medicalServiceRepository.save(s);
            log.info("✅ [FINANCE] Service mis à jour: {} ({})", updated.getNom(), updated.getId());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "content", updated,
                    "message", "Service mis à jour"
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/services/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un service médical (Admin uniquement)")
    public ResponseEntity<Map<String, Object>> deleteMedicalService(@PathVariable Long id) {
        return medicalServiceRepository.findById(id).<ResponseEntity<Map<String, Object>>>map(s -> {
            medicalServiceRepository.delete(s);
            log.info("✅ [FINANCE] Service supprimé: {} ({})", s.getNom(), id);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Service supprimé");
            return ResponseEntity.ok(response);
        }).orElse(ResponseEntity.notFound().build());
    }

    /* Aliases /tarifs pour compatibilité frontend - Admin uniquement pour CRUD */
    @PostMapping("/tarifs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> createTarif(@RequestBody MedicalService service) {
        return createMedicalService(service);
    }

    @PutMapping("/tarifs/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> updateTarif(@PathVariable Long id, @RequestBody MedicalService details) {
        return updateMedicalService(id, details);
    }

    @DeleteMapping("/tarifs/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> deleteTarif(@PathVariable Long id) {
        return deleteMedicalService(id);
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
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erreur serveur: " + (e.getMessage() != null ? e.getMessage() : "Unknown error"));
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping("/all-lab-payments")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'RECEPTION', 'CAISSIER')")
    @Operation(summary = "Récupérer tous les paiements laboratoire avec filtre optionnel par date")
    public ResponseEntity<Map<String, Object>> getAllLabPayments(
            @RequestParam(required = false) String date) {
        
        log.info("📥 [FINANCE CTRL] Récupération des paiements laboratoire - Date: {}", date);

        try {
            Long hId = HospitalTenantContext.getHospitalId();
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

            // Filtrer par hôpital puis par examens prescrits
            List<Consultation> hospitalFiltered = consultations.stream()
                .filter(c -> hId == null || (c.getPatient() != null && c.getPatient().getHospital() != null && c.getPatient().getHospital().getId().equals(hId)))
                .collect(Collectors.toList());
            List<Consultation> withExams = hospitalFiltered.stream()
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
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erreur: " + (e.getMessage() != null ? e.getMessage() : "Unknown error"));
            return ResponseEntity.internalServerError().body(errorResponse);
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

        // ── ABONNÉ : infos depuis admission ───────────────────────────────────────
        Admission admission = c.getAdmission();
        Boolean isAbonne = admission != null ? admission.getIsAbonne() : false;
        Long companyId = null;
        String companyName = null;
        String matricule = null;
        BigDecimal coverageRate = null;

        if (admission != null && Boolean.TRUE.equals(isAbonne) && admission.getCompany() != null) {
            companyId = admission.getCompany().getId();
            companyName = admission.getCompany().getName();
            matricule = admission.getMatricule();
            coverageRate = admission.getCoverageRate();
        }

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
                // ✅ Mapper la devise
                .currency(exam.getCurrency())
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
            // ── ABONNÉ ─────────────────────────────────────────────────────────────
            .isAbonne(isAbonne)
            .companyId(companyId)
            .companyName(companyName)
            .matricule(matricule)
            .coverageRate(coverageRate)
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
            
            // 🔔 Notifier le laboratoire de l'arrivée du patient (après paiement confirmé)
            try {
                String patientName = c.getPatient().getFirstName() + " " + c.getPatient().getLastName();
                String patientCode = c.getPatient().getPatientCode();
                
                // Récupérer les noms des examens prescrits
                List<String> examNames = c.getPrescribedExams().stream()
                    .filter(exam -> exam.getActive() == null || exam.getActive())
                    .map(exam -> exam.getServiceName())
                    .collect(Collectors.toList());
                
                if (!examNames.isEmpty()) {
                    labAlertService.notifyNewPatientForExams(patientName, patientCode, examNames);
                    log.info("🔔 [FINANCE CTRL] Notification envoyée au labo - Patient {} prêt pour {} examens", patientName, examNames.size());
                }
            } catch (Exception notifyError) {
                log.error("❌ [FINANCE CTRL] Erreur notification labo: {}", notifyError.getMessage());
                // Ne pas bloquer l'opération principale si notification échoue
            }
            
            log.info("✅ [FINANCE CTRL] Consultation {} envoyée au labo", consultationId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Examen envoyé au laboratoire",
                "consultationId", consultationId,
                "status", "AU_LABO"
            ));
            
        } catch (Exception e) {
            log.error("❌ [FINANCE CTRL] ERREUR envoi labo: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erreur: " + (e.getMessage() != null ? e.getMessage() : "Unknown error"));
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @PostMapping("/admissions/{admissionId}/send-to-doctor")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'RECEPTION', 'CAISSIER')")
    @Operation(summary = "Envoyer l'admission au docteur après paiement")
    public ResponseEntity<Map<String, Object>> sendToDoctor(
            @PathVariable Long admissionId,
            @RequestBody(required = false) Map<String, Object> requestBody) {
        
        log.info("📤 [FINANCE CTRL] Envoi au docteur - Admission: {}", admissionId);
        
        try {
            // Extraire doctorId du body
            Long doctorId = null;
            if (requestBody != null && requestBody.containsKey("doctorId")) {
                Object docIdObj = requestBody.get("doctorId");
                if (docIdObj != null) {
                    doctorId = Long.valueOf(docIdObj.toString());
                }
            }
            
            // Récupérer la consultation associée à l'admission
            Map<String, Object> result = financeService.sendToDoctor(admissionId, doctorId);
            
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
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erreur lors de l'envoi au docteur: " + (e.getMessage() != null ? e.getMessage() : "Unknown error"));
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @PostMapping("/prescriptions/{prescriptionId}/pay")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'CAISSIER')")
    @Operation(summary = "Payer une prescription laboratoire")
    public ResponseEntity<Map<String, Object>> payPrescription(
            @PathVariable Long prescriptionId,
            @RequestBody(required = false) Map<String, Object> paymentData) {
        
        log.info("💊 [FINANCE CTRL] Paiement prescription - ID: {}", prescriptionId);
        
        try {
            String paymentMethod = paymentData != null ? (String) paymentData.get("paymentMethod") : "ESPECES";
            Object amountObj = paymentData != null ? paymentData.get("amountPaid") : null;
            Double amountPaid = amountObj != null ? Double.valueOf(amountObj.toString()) : 0.0;
            
            Map<String, Object> result = financeService.payPrescription(prescriptionId, paymentMethod, amountPaid, getCurrentUserId());
            
            boolean success = Boolean.TRUE.equals(result.get("success"));
            if (success) {
                log.info("✅ [FINANCE CTRL] Paiement prescription réussi");
                return ResponseEntity.ok(result);
            } else {
                log.error("❌ [FINANCE CTRL] Échec paiement prescription: {}", result.get("message"));
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            log.error("❌ [FINANCE CTRL] ERREUR paiement prescription: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erreur lors du paiement de la prescription: " + (e.getMessage() != null ? e.getMessage() : "Unknown error"));
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping("/prescriptions/pending")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'CAISSIER')")
    @Operation(summary = "Récupérer les prescriptions en attente de paiement")
    public ResponseEntity<Map<String, Object>> getPendingPrescriptions() {
        log.info("📋 [FINANCE CTRL] Récupération prescriptions en attente de paiement");
        
        try {
            Map<String, Object> result = financeService.getPendingPrescriptions();
            
            boolean success = Boolean.TRUE.equals(result.get("success"));
            if (success) {
                log.info("✅ [FINANCE CTRL] Prescriptions en attente récupérées");
                return ResponseEntity.ok(result);
            } else {
                log.error("❌ [FINANCE CTRL] Échec récupération: {}", result.get("message"));
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            log.error("❌ [FINANCE CTRL] ERREUR récupération prescriptions: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erreur lors de la récupération: " + (e.getMessage() != null ? e.getMessage() : "Unknown error"));
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * ★ NOUVEAU: Endpoint pour payer les examens laboratoire
     * Appelé par la caisse laboratoire via PaymentModal
     */
    @PostMapping("/pay-lab/{consultationId}")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'RECEPTION', 'CAISSIER')")
    @Operation(summary = "Payer les examens laboratoire d'une consultation")
    public ResponseEntity<Map<String, Object>> payLabExams(
            @PathVariable Long consultationId,
            @RequestBody(required = false) Map<String, Object> paymentData) {

        log.info("💰 [FINANCE CTRL] Paiement examens laboratoire - Consultation ID: {}", consultationId);

        try {
            // Récupérer le montant total des examens
            BigDecimal totalAmount = consultationService.calculatePrescriptionTotal(consultationId);

            if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
                log.warn("⚠️ [FINANCE CTRL] Montant invalide pour consultation ID: {}", consultationId);
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Montant invalide ou aucun examen à payer"
                ));
            }

            // ── Montant payé : depuis le frontend (ticket modeste pour abonnés) ─────────
            Double amountPaid = null;
            if (paymentData != null && paymentData.containsKey("amountPaid")) {
                Object amountObj = paymentData.get("amountPaid");
                if (amountObj != null) {
                    amountPaid = Double.valueOf(amountObj.toString());
                }
            }
            // Fallback : utiliser totalAmount si non fourni (patient ordinaire)
            if (amountPaid == null) {
                amountPaid = totalAmount.doubleValue();
            }

            // Extraire la méthode de paiement depuis la requête
            String paymentMethodStr = null;
            if (paymentData != null && paymentData.containsKey("paymentMethod")) {
                Object pmObj = paymentData.get("paymentMethod");
                if (pmObj != null) paymentMethodStr = pmObj.toString();
            }

            // Appeler le service de paiement qui applique la couverture abonné
            consultationService.updateExamPaymentAndSendToLab(consultationId, amountPaid, paymentMethodStr);

            // 🔔 Notifier le laboratoire du paiement confirmé
            try {
                Consultation consultation = consultationRepository.findById(consultationId)
                    .orElseThrow(() -> new RuntimeException("Consultation non trouvée"));

                String patientName = consultation.getPatient().getFirstName() + " " + consultation.getPatient().getLastName();
                String patientCode = consultation.getPatient().getPatientCode();

                labAlertService.notifyPaymentConfirmed(patientName, patientCode, amountPaid.toString());
                log.info("🔔 [FINANCE CTRL] Notification envoyée au labo - Paiement confirmé pour {}", patientName);
            } catch (Exception notifyError) {
                log.error("❌ [FINANCE CTRL] Erreur notification labo: {}", notifyError.getMessage());
                // Ne pas bloquer si notification échoue
            }

            log.info("✅ [FINANCE CTRL] Paiement examens laboratoire réussi - Consultation ID: {}, Montant: {}",
                    consultationId, amountPaid);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Paiement des examens laboratoire effectué avec succès",
                "consultationId", consultationId,
                "amountPaid", amountPaid
            ));

        } catch (Exception e) {
            log.error("❌ [FINANCE CTRL] ERREUR paiement examens laboratoire: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erreur lors du paiement des examens: " + (e.getMessage() != null ? e.getMessage() : "Unknown error"));
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🏥 FLUX LABO POUR ABONNÉS : Envoi direct sans paiement (couverture 100%)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * POST /api/finance/send-lab-subscriber/{consultationId}
     * Envoie les examens au labo pour un abonné avec couverture 100% (sans paiement)
     */
    @PostMapping("/send-lab-subscriber/{consultationId}")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    @Operation(summary = "Envoyer examens labo pour abonné couverture 100%")
    public ResponseEntity<Map<String, Object>> sendExamsToLabForSubscriber(
            @PathVariable Long consultationId) {
        try {
            log.info("🏥 [FINANCE] Envoi direct examens labo pour abonné couverture 100% - consultation ID: {}", consultationId);

            ConsultationDTO consultationDTO = consultationService.sendExamsToLabForSubscriber(consultationId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Examens envoyés au laboratoire avec succès (couverture 100%)");
            response.put("consultation", consultationDTO);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ [FINANCE] ERREUR envoi examens labo abonné: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erreur lors de l'envoi des examens: " + (e.getMessage() != null ? e.getMessage() : "Unknown error"));
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 💰 FLUX PHARMACIE → FINANCE : Validation des paiements
    // ═══════════════════════════════════════════════════════════════════

    /**
     * GET /api/finance/pharmacy/pending-payments
     * Récupère les commandes pharmacie en attente de paiement
     */
    @GetMapping("/pharmacy/pending-payments")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'CAISSIER')")
    @Operation(summary = "Liste des paiements pharmacie en attente")
    public ResponseEntity<Map<String, Object>> getPendingPharmacyPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            log.info("📋 [FINANCE] Récupération des paiements pharmacie en attente");
            
            int safeSize = Math.min(size, 100);
            Pageable pageable = PageRequest.of(page, safeSize);
            // 🏥 MULTI-TENANT : commandes en attente de l'hôpital courant uniquement
            Long hId = HospitalTenantContext.getHospitalId();
            var orders = (hId != null)
                ? pharmacyOrderRepository.findByStatusAndHospitalId(PharmacyOrderStatus.EN_ATTENTE_PAIEMENT, hId, pageable)
                : pharmacyOrderRepository.findByStatus(PharmacyOrderStatus.EN_ATTENTE_PAIEMENT, pageable);
            
            List<Map<String, Object>> result = orders.getContent().stream()
                .map(order -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", order.getId());
                    map.put("orderCode", order.getOrderCode());
                    map.put("customerName", order.getCustomerName());
                    map.put("totalAmount", order.getTotalAmount());
                    map.put("createdAt", order.getCreatedAt());
                    map.put("itemCount", order.getItems() != null ? order.getItems().size() : 0);
                    map.put("status", order.getStatus().name());
                    return map;
                })
                .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("content", result);
            response.put("totalElements", orders.getTotalElements());
            response.put("totalPages", orders.getTotalPages());
            
            log.info("✅ [FINANCE] {} commandes pharmacie en attente", orders.getTotalElements());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [FINANCE] Erreur récupération paiements pharmacie: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erreur: " + (e.getMessage() != null ? e.getMessage() : "Unknown"));
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * POST /api/finance/pharmacy/confirm-payment/{orderId}
     * Confirme le paiement d'une commande pharmacie (déclenche le déstockage)
     */
    @PostMapping("/pharmacy/confirm-payment/{orderId}")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'CAISSIER')")
    @Operation(summary = "Confirmer le paiement d'une commande pharmacie")
    public ResponseEntity<Map<String, Object>> confirmPharmacyPayment(
            @PathVariable Long orderId,
            @RequestBody Map<String, Object> paymentData) {
        try {
            Long cashierId = getCurrentUserId();
            BigDecimal amountPaid = new BigDecimal(paymentData.get("amountPaid").toString());
            String paymentMethod = (String) paymentData.getOrDefault("paymentMethod", "ESPECES");
            
            log.info("💰 [FINANCE] Confirmation paiement pharmacie - Order: {}, Caissier: {}, Montant: {} $", 
                orderId, cashierId, amountPaid);
            
            PharmacyOrderDTO updatedOrder = pharmacyService.confirmPaymentByFinance(
                orderId, cashierId, amountPaid, paymentMethod);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Paiement confirmé - Stock décrémenté");
            response.put("order", updatedOrder);
            
            log.info("✅ [FINANCE] Paiement pharmacie confirmé - Order: {}", orderId);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [FINANCE] Erreur confirmation paiement pharmacie: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erreur: " + (e.getMessage() != null ? e.getMessage() : "Unknown"));
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * GET /api/finance/pharmacy/order/{orderId}
     * Détails d'une commande pharmacie pour la finance
     */
    @GetMapping("/pharmacy/order/{orderId}")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN', 'CAISSIER', 'PHARMACY')")
    @Operation(summary = "Détails d'une commande pharmacie")
    public ResponseEntity<Map<String, Object>> getPharmacyOrderDetails(@PathVariable Long orderId) {
        try {
            PharmacyOrderDTO order = pharmacyService.getOrderById(orderId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("order", order);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [FINANCE] Erreur récupération commande: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Commande non trouvée");
            return ResponseEntity.badRequest().body(errorResponse);
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
