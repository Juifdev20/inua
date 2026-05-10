package com.hospital.backend.controller;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.LabTestStatus;
import com.hospital.backend.service.LabTestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/lab-tests")
@RequiredArgsConstructor
@Tag(name = "Laboratoire", description = "Gestion des tests de laboratoire")
public class LabTestController {
    
    private final LabTestService labTestService;
    
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTEUR', 'LABORATOIRE')")
    @Operation(summary = "Créer un test", description = "Crée une nouvelle demande de test de laboratoire")
    public ResponseEntity<ApiResponse<LabTestDTO>> create(@Valid @RequestBody LabTestDTO labTestDTO) {
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
    @Operation(summary = "Tests en attente", description = "Récupère tous les tests en attente de traitement")
    public ResponseEntity<ApiResponse<List<LabTestDTO>>> getPendingTests() {
        List<LabTestDTO> labTests = labTestService.getPendingTests();
        return ResponseEntity.ok(ApiResponse.success(labTests));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LABORATOIRE')")
    @Operation(summary = "Modifier un test", description = "Met à jour un test de laboratoire")
    public ResponseEntity<ApiResponse<LabTestDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody LabTestDTO labTestDTO) {
        LabTestDTO updated = labTestService.update(id, labTestDTO);
        return ResponseEntity.ok(ApiResponse.success("Test mis à jour", updated));
    }
    
    @PostMapping("/{id}/results")
    @PreAuthorize("hasAnyRole('ADMIN', 'LABORATOIRE')")
    @Operation(summary = "Ajouter les résultats", description = "Ajoute les résultats à un test")
    public ResponseEntity<ApiResponse<LabTestDTO>> addResults(
            @PathVariable Long id,
            @RequestParam String results,
            @RequestParam(required = false) String interpretation) {
        LabTestDTO updated = labTestService.addResults(id, results, interpretation);
        return ResponseEntity.ok(ApiResponse.success("Résultats ajoutés", updated));
    }
    
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'LABORATOIRE')")
    @Operation(summary = "Changer le statut", description = "Met à jour le statut d'un test")
    public ResponseEntity<ApiResponse<LabTestDTO>> updateStatus(
            @PathVariable Long id,
            @RequestParam LabTestStatus status) {
        LabTestDTO updated = labTestService.updateStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Statut mis à jour", updated));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un test", description = "Supprime un test de laboratoire")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        labTestService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Test supprimé", null));
    }
}
