package com.hospital.backend.controller;

import com.hospital.backend.dto.LabResultEntryDTO;
import com.hospital.backend.dto.LabQueueItemDTO;
import com.hospital.backend.dto.LabSubmissionDTO;
import com.hospital.backend.dto.ResultItemDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.repository.ConsultationRepository;
import com.hospital.backend.repository.LabTestRepository;
import com.hospital.backend.repository.PrescribedExamRepository;
import com.hospital.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * ★ CONTRÔLEUR LABORATOIRE - Gestion de la "Boîte" d'examens
 * 
 * Workflow:
 * 1. PRESCRIBED → Patient prescrit examens (Caisse Laboratoire les voit)
 * 2. PAID → Caisse encaisse
 * 3. IN_PROGRESS → Labo reçoit et traite
 * 4. RESULTS_AVAILABLE → Résultats saisis, prêts pour médecin
 * 5. DELIVERED_TO_DOCTOR → Médecin consulte les résultats
 * 6. ARCHIVED → Dossier clos
 */
@Slf4j
@RestController
@RequestMapping("/api/lab")
@RequiredArgsConstructor
@Tag(name = "Laboratoire", description = "Gestion des examens de laboratoire et des résultats")
@CrossOrigin(origins = "*")
public class LabController {

    private final ConsultationRepository consultationRepository;
    private final PrescribedExamRepository prescribedExamRepository;
    private final LabTestRepository labTestRepository;
    private final UserRepository userRepository;

    /**
     * ★ Récupère la file d'attente du laboratoire (les "boîtes" à traiter)
     * Filtre: examens payés ou en cours au laboratoire
     */
    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('LABORATOIRE', 'ADMIN', 'LAB_TECH')")
    @Operation(summary = "File d'attente du laboratoire - Boîtes à traiter")
    public ResponseEntity<Map<String, Object>> getLabQueue(
            @RequestParam(required = false) String status) {
        
        log.info("🔬 [LAB CTRL] Récupération file d'attente - Statut: {}", status);

        try {
            // Récupérer les consultations avec examens prescrits au statut approprié
            List<ConsultationStatus> targetStatuses = List.of(
                ConsultationStatus.EXAMENS_PAYES,
                ConsultationStatus.AU_LABO
            );

            List<Consultation> consultations = consultationRepository
                .findByStatusInWithPatientDoctorAndExams(targetStatuses);

            // Mapper en DTO pour le labo
            List<LabQueueItemDTO> queueItems = consultations.stream()
                .map(this::mapToLabQueueItem)
                .filter(item -> item.getExams() != null && !item.getExams().isEmpty())
                .collect(Collectors.toList());

            log.info("🔬 [LAB CTRL] {} boîtes dans la file d'attente", queueItems.size());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", queueItems,
                "message", "File d'attente du laboratoire"
            ));
        } catch (Exception e) {
            log.error("❌ [LAB CTRL] Erreur: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Erreur: " + e.getMessage()
            ));
        }
    }

    /**
     * ★ Récupère une "boîte" spécifique avec tous ses examens
     */
    @GetMapping("/box/{consultationId}")
    @PreAuthorize("hasAnyRole('LABORATOIRE', 'ADMIN', 'LAB_TECH', 'DOCTOR')")
    @Operation(summary = "Récupérer une boîte d'examens complète")
    public ResponseEntity<Map<String, Object>> getLabBox(@PathVariable Long consultationId) {
        log.info("🔬 [LAB CTRL] Récupération boîte: {}", consultationId);

        try {
            Consultation consultation = consultationRepository
                .findByIdWithPatientAndExams(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée"));

            LabQueueItemDTO box = mapToLabQueueItem(consultation);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", box,
                "message", "Boîte d'examens récupérée"
            ));
        } catch (Exception e) {
            log.error("❌ [LAB CTRL] Erreur: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * ★ Démarre le traitement d'une boîte (statut IN_PROGRESS)
     */
    @PostMapping("/box/{consultationId}/start")
    @PreAuthorize("hasAnyRole('LABORATOIRE', 'ADMIN', 'LAB_TECH')")
    @Operation(summary = "Démarrer le traitement d'une boîte d'examens")
    public ResponseEntity<Map<String, Object>> startProcessing(
            @PathVariable Long consultationId,
            @RequestParam String technicianName) {
        
        log.info("🔬 [LAB CTRL] Démarrage traitement boîte: {} par {}", consultationId, technicianName);

        try {
            Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée"));

            // Mettre à jour le statut de la consultation
            consultation.setStatus(ConsultationStatus.AU_LABO);
            consultationRepository.save(consultation);

            // Mettre à jour les examens actifs
            consultation.getPrescribedExams().stream()
                .filter(PrescribedExam::getActive)
                .forEach(exam -> {
                    exam.setStatus(PrescribedExamStatus.IN_PROGRESS);
                    prescribedExamRepository.save(exam);
                });

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Traitement démarré",
                "consultationId", consultationId,
                "status", "IN_PROGRESS"
            ));
        } catch (Exception e) {
            log.error("❌ [LAB CTRL] Erreur: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * ★ Saisie des résultats pour un examen avec détection des valeurs critiques
     */
    @PostMapping("/exam/{examId}/result")
    @PreAuthorize("hasAnyRole('LABORATOIRE', 'ADMIN', 'LAB_TECH')")
    @Operation(summary = "Saisir le résultat d'un examen avec détection critique")
    public ResponseEntity<Map<String, Object>> enterResult(
            @PathVariable Long examId,
            @RequestBody LabResultEntryDTO resultDTO) {
        
        log.info("🔬 [LAB CTRL] Saisie résultat examen: {} - Valeur: {}", examId, resultDTO.getResultValue());

        try {
            PrescribedExam exam = prescribedExamRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Examen non trouvé"));

            // Détecter si la valeur est critique
            boolean isCritical = detectCriticalValue(
                resultDTO.getResultValue(),
                resultDTO.getReferenceMin(),
                resultDTO.getReferenceMax()
            );

            // Mettre à jour l'examen
            exam.setResultValue(resultDTO.getResultValue());
            exam.setUnit(resultDTO.getUnit());
            exam.setReferenceMin(resultDTO.getReferenceMin());
            exam.setReferenceMax(resultDTO.getReferenceMax());
            exam.setReferenceRangeText(resultDTO.getReferenceRangeText());
            exam.setLabComment(resultDTO.getLabComment());
            exam.setIsCritical(isCritical);
            exam.setResultEnteredAt(LocalDateTime.now());
            exam.setResultEnteredBy(resultDTO.getTechnicianName());
            exam.setAnalysisMethod(resultDTO.getAnalysisMethod());
            exam.setStatus(PrescribedExamStatus.COMPLETED);

            prescribedExamRepository.save(exam);

            log.info("🔬 [LAB CTRL] Résultat enregistré - Critique: {}", isCritical);

            // Construction de la réponse (Map.of() n'accepte pas les valeurs null)
            Map<String, Object> response = new java.util.HashMap<>();
            response.put("success", true);
            response.put("message", "Résultat enregistré");
            response.put("examId", examId);
            response.put("isCritical", isCritical);
            if (isCritical) {
                response.put("warning", "⚠️ VALEUR CRITIQUE DÉTECTÉE");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ [LAB CTRL] Erreur: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * ★ SOUMISSION GROUPÉE - Valider une boîte complète (Master-Detail)
     * Workflow: PAID → AU_LABO → RESULTS_PRETS
     */
    @PostMapping("/box/submit")
    @PreAuthorize("hasAnyRole('LABORATOIRE', 'ADMIN', 'LAB_TECH')")
    @Operation(summary = "Soumission groupée des résultats d'une boîte")
    public ResponseEntity<Map<String, Object>> submitBoxResults(@RequestBody LabSubmissionDTO submission) {
        log.info("🔬 [LAB CTRL] Soumission boîte: {} - {} résultats - médecin: {}", 
            submission.getConsultationId(), 
            submission.getResults() != null ? submission.getResults().size() : 0,
            submission.getDoctorId());

        try {
            // Validation
            if (submission.getConsultationId() == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "consultationId est requis"
                ));
            }

            Consultation consultation = consultationRepository.findById(submission.getConsultationId())
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée"));

            // Mettre à jour le statut de la consultation à RESULTATS_PRETS
            consultation.setStatus(ConsultationStatus.RESULTATS_PRETS);
            consultationRepository.save(consultation);

            // Récupérer le médecin destinataire si fourni
            User doctorRecipient = null;
            if (submission.getDoctorId() != null) {
                doctorRecipient = userRepository.findById(submission.getDoctorId())
                    .orElse(null);
                if (doctorRecipient != null) {
                    log.info("🔬 [LAB CTRL] Médecin destinataire: {}", doctorRecipient.getFirstName() + " " + doctorRecipient.getLastName());
                }
            }

            // Traiter les résultats
            int processedCount = 0;
            int criticalCount = 0;
            
            if (submission.getResults() != null && !submission.getResults().isEmpty()) {
                for (ResultItemDTO result : submission.getResults()) {
                    if (result.getTestId() == null) continue;
                    
                    PrescribedExam exam = prescribedExamRepository.findById(result.getTestId())
                        .orElseThrow(() -> new RuntimeException("Examen " + result.getTestId() + " non trouvé"));

                    // Si valeur vide, passer
                    if (result.getValue() == null || result.getValue().trim().isEmpty()) {
                        continue;
                    }

                    // Détection valeur critique
                    boolean isCritical = detectCriticalValue(
                        result.getValue(),
                        exam.getReferenceMin(),
                        exam.getReferenceMax()
                    );

                    // Mise à jour de l'examen PrescribedExam
                    exam.setResultValue(result.getValue());
                    exam.setLabComment(result.getComment());
                    exam.setIsCritical(isCritical);
                    exam.setResultEnteredAt(LocalDateTime.now());
                    exam.setResultEnteredBy("Technicien"); // TODO: Get from auth context
                    exam.setStatus(PrescribedExamStatus.RESULTS_AVAILABLE);
                    
                    prescribedExamRepository.save(exam);
                    
                    // ✅ Créer ou mettre à jour l'entité LabTest pour le médecin
                    createOrUpdateLabTest(consultation, exam, doctorRecipient, result, isCritical);
                    
                    processedCount++;
                    if (isCritical) criticalCount++;
                }
            }

            log.info("🔬 [LAB CTRL] Boîte validée - {} résultats, {} critiques", processedCount, criticalCount);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Boîte validée et transmise au médecin",
                "consultationId", submission.getConsultationId(),
                "processedCount", processedCount,
                "criticalCount", criticalCount,
                "newStatus", "RESULTATS_PRETS"
            ));
        } catch (Exception e) {
            log.error("❌ [LAB CTRL] Erreur soumission boîte: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * ✅ Crée ou met à jour une entité LabTest pour que le médecin puisse voir les résultats
     */
    private void createOrUpdateLabTest(Consultation consultation, PrescribedExam exam, 
                                       User doctorRecipient, ResultItemDTO result, boolean isCritical) {
        try {
            // Chercher si un LabTest existe déjà pour cette consultation et ce type d'examen
            LabTest labTest = labTestRepository.findByConsultationId(consultation.getId(), null)
                .getContent()
                .stream()
                .filter(lt -> lt.getTestName() != null && lt.getTestName().equals(exam.getServiceName()))
                .findFirst()
                .orElse(null);
            
            if (labTest == null) {
                // Créer un nouveau LabTest
                labTest = new LabTest();
                labTest.setConsultation(consultation);
                labTest.setPatient(consultation.getPatient());
                labTest.setTestType(exam.getServiceName());
                labTest.setTestName(exam.getServiceName());
                labTest.setRequestedBy(consultation.getDoctor());
                labTest.setRequestedAt(LocalDateTime.now());
            }
            
            // Mettre à jour les résultats
            labTest.setResults("{\"valeur\": \"" + result.getValue() + "\", \"unite\": \"" + exam.getUnit() + "\"}");
            labTest.setInterpretation(exam.getLabComment());
            labTest.setNormalRange(exam.getReferenceRangeText());
            labTest.setUnit(exam.getUnit());
            labTest.setStatus(LabTestStatus.TERMINE);
            labTest.setProcessedBy(null); // Peut être mis à jour avec l'utilisateur labo connecté
            labTest.setProcessedAt(LocalDateTime.now());
            labTest.setFromFinance(true);
            
            // ✅ IMPORTANT: Définir le médecin destinataire pour que le médecin puisse voir le résultat
            if (doctorRecipient != null) {
                labTest.setDoctorRecipient(doctorRecipient);
            } else if (consultation.getDoctor() != null) {
                // Fallback: utiliser le médecin de la consultation
                labTest.setDoctorRecipient(consultation.getDoctor());
            }
            
            labTestRepository.save(labTest);
            log.info("🔬 [LAB CTRL] LabTest créé/mis à jour pour examen {} - médecin: {}", 
                exam.getServiceName(), 
                labTest.getDoctorRecipient() != null ? labTest.getDoctorRecipient().getId() : "aucun");
        } catch (Exception e) {
            log.error("❌ [LAB CTRL] Erreur création LabTest: {}", e.getMessage());
            // Ne pas bloquer le flux si la création du LabTest échoue
        }
    }

    /**
     * ★ Finalise une boîte (tous les résultats saisis) → RESULTS_AVAILABLE
     */
    @PostMapping("/box/{consultationId}/finalize")
    @PreAuthorize("hasAnyRole('LABORATOIRE', 'ADMIN', 'LAB_TECH')")
    @Operation(summary = "Finaliser une boîte - Résultats prêts pour le médecin")
    public ResponseEntity<Map<String, Object>> finalizeBox(@PathVariable Long consultationId) {
        log.info("🔬 [LAB CTRL] Finalisation boîte: {}", consultationId);

        try {
            Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée"));

            // Vérifier que tous les examens actifs ont des résultats
            List<PrescribedExam> activeExams = consultation.getPrescribedExams().stream()
                .filter(PrescribedExam::getActive)
                .collect(Collectors.toList());

            boolean allHaveResults = activeExams.stream()
                .allMatch(e -> e.getResultValue() != null && !e.getResultValue().isEmpty());

            if (!allHaveResults) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Tous les examens actifs doivent avoir des résultats"
                ));
            }

            // Mettre à jour les statuts
            activeExams.forEach(exam -> {
                exam.setStatus(PrescribedExamStatus.RESULTS_AVAILABLE);
                prescribedExamRepository.save(exam);
            });

            log.info("🔬 [LAB CTRL] Boîte finalisée - {} résultats disponibles", activeExams.size());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Résultats disponibles pour le médecin",
                "consultationId", consultationId,
                "resultsCount", activeExams.size(),
                "criticalCount", activeExams.stream().filter(PrescribedExam::getIsCritical).count()
            ));
        } catch (Exception e) {
            log.error("❌ [LAB CTRL] Erreur: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * ★ Le médecin consulte les résultats → DELIVERED_TO_DOCTOR
     */
    @PostMapping("/box/{consultationId}/view-results")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @Operation(summary = "Médecin consulte les résultats")
    public ResponseEntity<Map<String, Object>> viewResults(@PathVariable Long consultationId) {
        log.info("🔬 [LAB CTRL] Médecin consulte résultats: {}", consultationId);

        try {
            Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation non trouvée"));

            // Mettre à jour le statut des examens
            consultation.getPrescribedExams().stream()
                .filter(e -> e.getStatus() == PrescribedExamStatus.RESULTS_AVAILABLE)
                .forEach(exam -> {
                    exam.setStatus(PrescribedExamStatus.DELIVERED_TO_DOCTOR);
                    prescribedExamRepository.save(exam);
                });

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Résultats consultés par le médecin"
            ));
        } catch (Exception e) {
            log.error("❌ [LAB CTRL] Erreur: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // ═════════════════════════════════════════════════════════════════
    // MÉTHODES PRIVÉES
    // ═════════════════════════════════════════════════════════════════

    private LabQueueItemDTO mapToLabQueueItem(Consultation c) {
        List<LabQueueItemDTO.ExamItemDTO> exams = c.getPrescribedExams().stream()
            .map(exam -> LabQueueItemDTO.ExamItemDTO.builder()
                .id(exam.getId())
                .serviceName(exam.getServiceName())
                .unitPrice(exam.getUnitPrice())
                .quantity(exam.getQuantity())
                .totalPrice(exam.getTotalPrice())
                .doctorNote(exam.getDoctorNote())
                .active(exam.getActive())
                .status(exam.getStatus().name())
                // Résultats
                .resultValue(exam.getResultValue())
                .unit(exam.getUnit())
                .referenceRangeText(exam.getReferenceRangeText())
                .isCritical(exam.getIsCritical())
                .labComment(exam.getLabComment())
                .resultEnteredAt(exam.getResultEnteredAt())
                .build())
            .collect(Collectors.toList());

        return LabQueueItemDTO.builder()
            .consultationId(c.getId())
            .patientId(c.getPatient() != null ? c.getPatient().getId() : null)
            .patientName(c.getPatient() != null ? 
                c.getPatient().getFirstName() + " " + c.getPatient().getLastName() : "Patient inconnu")
            .patientCode(c.getPatient() != null ? c.getPatient().getPatientCode() : null)
            .doctorName(c.getDoctor() != null ? 
                c.getDoctor().getFirstName() + " " + c.getDoctor().getLastName() : "Docteur inconnu")
            .consultationStatus(c.getStatus().name())
            .createdAt(c.getCreatedAt())
            .updatedAt(c.getUpdatedAt())
            .exams(exams)
            .totalExams(exams.size())
            .pendingExams(exams.stream().filter(e -> e.getResultValue() == null || e.getResultValue().isEmpty()).count())
            .criticalExams(exams.stream().filter(e -> Boolean.TRUE.equals(e.getIsCritical())).count())
            .build();
    }

    /**
     * Détecte si une valeur numérique est hors des limites de référence (critique)
     */
    private boolean detectCriticalValue(String value, String minRef, String maxRef) {
        if (value == null || value.isEmpty() || value.trim().isEmpty()) return false;
        
        try {
            // Nettoyer et parser la valeur
            String cleanValue = value.replaceAll("[^0-9.,-]", "").replace(",", ".");
            if (cleanValue.isEmpty() || cleanValue.equals(".")) return false;
            
            BigDecimal numericValue = new BigDecimal(cleanValue);
            
            // Vérifier min
            if (minRef != null && !minRef.isEmpty() && !minRef.trim().isEmpty()) {
                String cleanMin = minRef.replaceAll("[^0-9.,-]", "").replace(",", ".");
                if (!cleanMin.isEmpty() && !cleanMin.equals(".")) {
                    BigDecimal min = new BigDecimal(cleanMin);
                    if (numericValue.compareTo(min) < 0) return true;
                }
            }
            
            // Vérifier max
            if (maxRef != null && !maxRef.isEmpty() && !maxRef.trim().isEmpty()) {
                String cleanMax = maxRef.replaceAll("[^0-9.,-]", "").replace(",", ".");
                if (!cleanMax.isEmpty() && !cleanMax.equals(".")) {
                    BigDecimal max = new BigDecimal(cleanMax);
                    if (numericValue.compareTo(max) > 0) return true;
                }
            }
        } catch (NumberFormatException | ArithmeticException e) {
            // Valeur non numérique ou erreur de parsing
            return false;
        }
        
        return false;
    }
}
