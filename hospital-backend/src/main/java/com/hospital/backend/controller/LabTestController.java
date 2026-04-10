package com.hospital.backend.controller;

import com.hospital.backend.dto.*;
import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.entity.LabTestStatus;
import com.hospital.backend.entity.User;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.service.LabTestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.hospital.backend.entity.LabTest;
import com.hospital.backend.repository.LabTestRepository;

@RestController
@RequestMapping("/api/lab-tests")
@RequiredArgsConstructor
@Tag(name = "Laboratoire", description = "Gestion des tests de laboratoire")
public class LabTestController {

    private static final Logger log = LoggerFactory.getLogger(LabTestController.class);
    private final LabTestService labTestService;
    private final UserRepository userRepository;
    private final LabTestRepository labTestRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTEUR', 'LABORATOIRE')")
    @Operation(summary = "Créer un test", description = "Crée une nouvelle demande de test de laboratoire")
    public ResponseEntity<ApiResponse<LabTestDTO>> create(@Valid @RequestBody LabTestDTO labTestDTO) {
        log.info("Requête de création de test pour le patient ID: {}", labTestDTO.getPatientId());
        LabTestDTO created = labTestService.create(labTestDTO);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Test de laboratoire créé", created));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir un test", description = "Récupère les détails d'un test de laboratoire")
    public ResponseEntity<ApiResponse<LabTestDTO>> getById(@PathVariable Long id) {
        LabTestDTO labTest = labTestService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(labTest));
    }

    @GetMapping("/code/{code}")
    @Operation(summary = "Obtenir par code", description = "Récupère un test par son code")
    public ResponseEntity<ApiResponse<LabTestDTO>> getByCode(@PathVariable String code) {
        LabTestDTO labTest = labTestService.getByCode(code);
        return ResponseEntity.ok(ApiResponse.success(labTest));
    }

    @GetMapping
    @Operation(summary = "Lister les tests", description = "Récupère la liste paginée des tests")
    public ResponseEntity<ApiResponse<PageResponse<LabTestDTO>>> getAll(
            @PageableDefault(size = 20, sort = "requestedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<LabTestDTO> labTests = labTestService.getAll(pageable);
        return ResponseEntity.ok(ApiResponse.success(labTests));
    }

    @GetMapping("/patient/{patientId}")
    @Operation(summary = "Tests par patient", description = "Récupère les tests d'un patient")
    public ResponseEntity<ApiResponse<PageResponse<LabTestDTO>>> getByPatient(
            @PathVariable Long patientId,
            @PageableDefault(size = 20) Pageable pageable) {
        PageResponse<LabTestDTO> labTests = labTestService.getByPatient(patientId, pageable);
        return ResponseEntity.ok(ApiResponse.success(labTests));
    }

    @GetMapping("/consultation/{consultationId}")
    @Operation(summary = "Tests par consultation", description = "Récupère les tests d'une consultation")
    public ResponseEntity<ApiResponse<PageResponse<LabTestDTO>>> getByConsultation(
            @PathVariable Long consultationId,
            @PageableDefault(size = 20) Pageable pageable) {
        PageResponse<LabTestDTO> labTests = labTestService.getByConsultation(consultationId, pageable);
        return ResponseEntity.ok(ApiResponse.success(labTests));
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Tests par statut", description = "Récupère les tests par statut")
    public ResponseEntity<ApiResponse<PageResponse<LabTestDTO>>> getByStatus(
            @PathVariable LabTestStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        PageResponse<LabTestDTO> labTests = labTestService.getByStatus(status, pageable);
        return ResponseEntity.ok(ApiResponse.success(labTests));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'LABORATOIRE')")
    @Operation(summary = "Tests en attente", description = "Récupère tous les tests en attente")
    public ResponseEntity<ApiResponse<PageResponse<LabTestDTO>>> getPendingTests(
            @PageableDefault(size = 20, sort = "requestedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<LabTestDTO> labTests = labTestService.getPendingTests(pageable);
        return ResponseEntity.ok(ApiResponse.success(labTests));
    }

    /**
     * ✅ Action de la Finance/Caisse
     * Cette méthode appelle addToQueue qui met fromFinance à true
     */
    @PostMapping("/queue")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Ajouter à la file d'attente", description = "Envoie l'examen au labo après paiement et retourne les médecins disponibles")
    public ResponseEntity<ApiResponse<QueueResponseDTO>> addToQueue(
            @Valid @RequestBody LabTestDTO labTestDTO) {
        log.info("Validation finance pour le test ID: {}", labTestDTO.getId());
        LabTestDTO updated = labTestService.addToQueue(labTestDTO);
        
        // Récupérer la liste des médecins disponibles
        List<UserDTO> doctors = labTestService.getAvailableDoctors();
        
        QueueResponseDTO response = QueueResponseDTO.builder()
                .labTest(updated)
                .availableDoctors(doctors)
                .message("Examen envoyé au laboratoire")
                .build();
                
        return ResponseEntity.ok(ApiResponse.success("Examen envoyé au laboratoire", response));
    }

    /**
     * ✅ Affichage pour le Laboratoire
     * Récupère uniquement les tests payés (fromFinance = true)
     */
    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('ADMIN', 'LABORATOIRE')")
    @Operation(summary = "Obtenir la file d'attente", description = "Liste des examens à traiter par le labo")
    public ResponseEntity<ApiResponse<PageResponse<LabTestDTO>>> getQueue(
            @PageableDefault(size = 20, sort = "requestedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<LabTestDTO> labTests = labTestService.getQueue(pageable);
        return ResponseEntity.ok(ApiResponse.success(labTests));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LABORATOIRE')")
    public ResponseEntity<ApiResponse<LabTestDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody LabTestDTO labTestDTO) {
        LabTestDTO updated = labTestService.update(id, labTestDTO);
        return ResponseEntity.ok(ApiResponse.success("Test mis à jour", updated));
    }

    @PostMapping("/{id}/results")
    @PreAuthorize("hasAnyRole('ADMIN', 'LABORATOIRE')")
    public ResponseEntity<ApiResponse<LabTestDTO>> addResults(
            @PathVariable Long id,
            @RequestParam String results,
            @RequestParam(required = false) String interpretation) {
        LabTestDTO updated = labTestService.addResults(id, results, interpretation);
        return ResponseEntity.ok(ApiResponse.success("Résultats ajoutés", updated));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'LABORATOIRE')")
    public ResponseEntity<ApiResponse<LabTestDTO>> updateStatus(
            @PathVariable Long id,
            @RequestBody StatusUpdateRequest request) {
        log.info("Changement de statut pour le test {}: {}", id, request.getStatus());
        LabTestStatus status = LabTestStatus.valueOf(request.getStatus().toUpperCase());
        LabTestDTO dto = labTestService.updateStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @GetMapping("/patient/{patientId}/active-tests")
    @PreAuthorize("hasAnyRole('ADMIN', 'LABORATOIRE', 'DOCTEUR')")
    public ResponseEntity<ApiResponse<List<LabTestDTO>>> getActiveTestsForPatient(
            @PathVariable Long patientId) {
        List<LabTestDTO> tests = labTestService.getActiveTestsForPatient(patientId);
        return ResponseEntity.ok(ApiResponse.success(tests));
    }

    @PostMapping("/batch-results")
    @PreAuthorize("hasAnyRole('ADMIN', 'LABORATOIRE')")
    public ResponseEntity<ApiResponse<BatchSubmitResult>> submitBatchResults(
            @Valid @RequestBody BatchResultRequest request) {
        BatchSubmitResult result = labTestService.submitBatchResults(request);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public  ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        labTestService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Test supprimé", null));
    }

    // =========================================================================
    // ✅ NOUVEAUX ENDPOINTS POUR LE FLUX LABORATOIRE -> DOCTEUR
    // =========================================================================

    @GetMapping("/available-doctors")
    // @PreAuthorize("hasAnyRole('ADMIN', 'LABORATOIRE')")
    @Operation(summary = "Lister les docteurs", description = "Récupère les docteurs pour l'envoi des résultats")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAvailableDoctors() {
        List<UserDTO> doctors = labTestService.getAvailableDoctors();
        return ResponseEntity.ok(ApiResponse.success(doctors));
    }

    @PostMapping("/send-to-doctor")
    // @PreAuthorize("hasAnyRole('ADMIN', 'LABORATOIRE')")
    @Operation(summary = "Envoyer au docteur", description = "Transmet les résultats finalisés à un médecin")
    public ResponseEntity<ApiResponse<Void>> sendResultsToDoctor(
            @Valid @RequestBody BatchResultRequest request) {
        log.info("Transmission des résultats au médecin ID: {}", request.getDoctorId());
        labTestService.sendResultsToDoctor(request);
        return ResponseEntity.ok(ApiResponse.success("Résultats transmis avec succès", null));
    }

    @GetMapping("/doctor-alerts/{doctorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTEUR')")
    @Operation(summary = "Alertes résultats", description = "Récupère les nouveaux résultats pour un docteur")
    public ResponseEntity<ApiResponse<List<LabTestDTO>>> getResultsByDoctor(@PathVariable Long doctorId) {
        List<LabTestDTO> results = labTestService.getResultsByDoctor(doctorId);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/doctor-results")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR')")
    @Operation(summary = "Résultats du docteur connecté", description = "Récupère tous les résultats de labo pour le médecin connecté via JWT")
    public ResponseEntity<ApiResponse<List<LabTestDTO>>> getResultsForDoctor() {
        // Extraire l'identifiant du docteur depuis le token JWT (username ou email)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String identifier = authentication.getName();
        
        // Debug: Log user authorities
        log.info("🔍 User authorities: {}", authentication.getAuthorities());
        log.info("🔍 User principal: {}", authentication.getPrincipal());
        
        log.info("📋 Récupération des résultats pour le docteur: {}", identifier);
        
        // Chercher par username ou email
        User currentDoctor = userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() -> new ResourceNotFoundException("Docteur non trouvé avec l'identifiant: " + identifier));
                
        List<LabTestDTO> results = labTestService.getTestsByDoctor(currentDoctor.getId());
        return ResponseEntity.ok(ApiResponse.success("Résultats récupérés avec succès", results));
    }

    @GetMapping("/patient/{patientId}/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTEUR', 'LABORATOIRE')")
    @Operation(summary = "Historique patient", description = "Récupère tous les résultats terminés d'un patient")
    public ResponseEntity<ApiResponse<List<LabTestDTO>>> getPatientHistory(@PathVariable Long patientId) {
        List<LabTestDTO> history = labTestService.getFinishedResultsByPatient(patientId);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    // =========================================================================
    // ✅ NOUVEAU ENDPOINT : RÉSULTATS GROUPÉS PAR CONSULTATION ("BOÎTE")
    // =========================================================================

    @GetMapping("/doctor/consultations")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR')")
    @Operation(summary = "Résultats groupés par consultation", description = "Récupère les résultats de labo groupés par consultation pour le médecin connecté")
    @Transactional(readOnly = true) // ✅ Garde la session ouverte pour lazy loading
    public ResponseEntity<ApiResponse<List<ConsultationLabResultsDTO>>> getGroupedResultsForDoctor() {
        try {
            // Extraire l'identifiant du docteur depuis le token JWT
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String identifier = authentication.getName();

            log.info("📦 [GROUPED] Récupération des résultats groupés pour le docteur: {}", identifier);

            // Chercher par username ou email
            User currentDoctor = userRepository.findByUsername(identifier)
                    .or(() -> userRepository.findByEmail(identifier))
                    .orElseThrow(() -> new ResourceNotFoundException("Docteur non trouvé avec l'identifiant: " + identifier));

            // Récupérer tous les tests du docteur
            List<LabTest> labTests = labTestRepository.findByDoctorRecipientId(currentDoctor.getId());

            // Grouper par consultation
            Map<Long, List<LabTest>> groupedByConsultation = labTests.stream()
                    .filter(lt -> lt.getConsultation() != null)
                    .collect(Collectors.groupingBy(lt -> lt.getConsultation().getId()));

            // Mapper en DTOs
            List<ConsultationLabResultsDTO> result = groupedByConsultation.entrySet().stream()
                    .map(entry -> mapToConsultationLabResultsDTO(entry.getKey(), entry.getValue()))
                    .filter(dto -> dto != null)
                    .collect(Collectors.toList());

            log.info("📦 [GROUPED] {} consultations avec résultats trouvées", result.size());

            return ResponseEntity.ok(ApiResponse.success("Résultats groupés récupérés avec succès", result));
        } catch (Exception e) {
            log.error("❌ Erreur lors de la récupération des résultats groupés: {}", e.getMessage(), e);
            return ResponseEntity.ok(ApiResponse.success("Aucun résultat trouvé", List.of()));
        }
    }
    
    private ConsultationLabResultsDTO mapToConsultationLabResultsDTO(Long consultationId, List<LabTest> labTests) {
        if (labTests.isEmpty()) return null;
        
        LabTest firstTest = labTests.get(0);
        
        // Mapper les résultats d'examens
        List<DoctorLabResultDTO> examResults = labTests.stream()
                .map(this::mapToExamResultDTO)
                .collect(Collectors.toList());
        
        // Compter les examens critiques
        long criticalCount = examResults.stream()
                .filter(er -> Boolean.TRUE.equals(er.getIsCritical()))
                .count();
        
        // Construire le DTO
        ConsultationLabResultsDTO.ConsultationLabResultsDTOBuilder builder = ConsultationLabResultsDTO.builder()
                .consultationId(consultationId)
                .consultationCode(firstTest.getConsultation() != null ? firstTest.getConsultation().getConsultationCode() : null)
                .consultationTitle(firstTest.getTestType()) // Utiliser le type comme titre par défaut
                .consultationDate(firstTest.getRequestedAt())
                .status(firstTest.getConsultation() != null && firstTest.getConsultation().getStatus() != null 
                        ? firstTest.getConsultation().getStatus().name() 
                        : "UNKNOWN")
                .patientId(firstTest.getPatient() != null ? firstTest.getPatient().getId() : null)
                .patientName(firstTest.getPatient() != null ? 
                        firstTest.getPatient().getFirstName() + " " + firstTest.getPatient().getLastName() : "Patient inconnu")
                .patientCode(firstTest.getPatient() != null ? firstTest.getPatient().getPatientCode() : null)
                .doctorId(firstTest.getDoctorRecipient() != null ? firstTest.getDoctorRecipient().getId() : null)
                .doctorName(firstTest.getDoctorRecipient() != null ? 
                        "Dr. " + firstTest.getDoctorRecipient().getFirstName() + " " + firstTest.getDoctorRecipient().getLastName() : null)
                .examResults(examResults)
                .totalExams(examResults.size())
                .criticalExams(criticalCount)
                .hasResults(!examResults.isEmpty())
                .resultsDate(firstTest.getProcessedAt());
        
        return builder.build();
    }
    
    private DoctorLabResultDTO mapToExamResultDTO(LabTest labTest) {
        // Parser le JSON des résultats si présent
        String resultValue = labTest.getResults();
        if (resultValue != null && resultValue.startsWith("{")) {
            try {
                // Essayer d'extraire la valeur du JSON
                int start = resultValue.indexOf("\"valeur\":\"");
                if (start != -1) {
                    start += 10;
                    int end = resultValue.indexOf("\"", start);
                    if (end != -1) {
                        resultValue = resultValue.substring(start, end);
                    }
                }
            } catch (Exception e) {
                // Garder la valeur originale en cas d'erreur
            }
        }
        
        return DoctorLabResultDTO.builder()
                .id(labTest.getId())
                .examName(labTest.getTestName())
                .resultValue(resultValue)
                .unit(labTest.getUnit())
                .referenceRange(labTest.getNormalRange())
                .comment(labTest.getInterpretation())
                .isCritical(labTest.getStatus() != null && 
                        (labTest.getStatus().name().contains("CRITIQUE") || 
                         (labTest.getResults() != null && labTest.getResults().contains("CRITIQUE"))))
                .resultDate(labTest.getProcessedAt())
                .build();
    }
}