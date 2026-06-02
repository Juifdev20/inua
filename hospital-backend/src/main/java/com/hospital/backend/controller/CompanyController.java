package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.dto.CompanyEmployeeRequest;
import com.hospital.backend.dto.CompanyEmployeeResponse;
import com.hospital.backend.dto.CompanyRequest;
import com.hospital.backend.dto.CompanyResponse;
import com.hospital.backend.dto.CompanyStatsDTO;
import com.hospital.backend.dto.ConsumptionRecordDTO;
import com.hospital.backend.dto.PatientConsumptionSummaryDTO;
import com.hospital.backend.entity.SubscriptionStatus;
import com.hospital.backend.service.CompanyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints de gestion des entreprises abonnées (réservés à l'administration).
 */
@RestController
@RequestMapping({"/api/companies", "/api/v1/companies"})
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Entreprises abonnées", description = "Gestion des entreprises et de leurs agents couverts")
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_FINANCE', 'ROLE_RECEPTION')")
    @Operation(summary = "Lister les entreprises", description = "Liste de toutes les entreprises, filtre optionnel par statut")
    public ResponseEntity<ApiResponse<List<CompanyResponse>>> getAll(
            @RequestParam(value = "status", required = false) SubscriptionStatus status) {
        List<CompanyResponse> list = (status != null)
                ? companyService.getCompaniesByStatus(status)
                : companyService.getAllCompanies();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_FINANCE', 'ROLE_RECEPTION')")
    @Operation(summary = "Obtenir une entreprise")
    public ResponseEntity<ApiResponse<CompanyResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(companyService.getCompanyById(id)));
    }

    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Créer une entreprise")
    public ResponseEntity<ApiResponse<CompanyResponse>> create(@Valid @RequestBody CompanyRequest request) {
        CompanyResponse created = companyService.createCompany(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Entreprise créée avec succès", created));
    }

    @PutMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Modifier une entreprise")
    public ResponseEntity<ApiResponse<CompanyResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody CompanyRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Entreprise mise à jour",
                companyService.updateCompany(id, request)));
    }

    @DeleteMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Supprimer une entreprise")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        companyService.deleteCompany(id);
        return ResponseEntity.ok(ApiResponse.success("Entreprise supprimée", null));
    }

    // ============================== EMPLOYEES ==============================

    @GetMapping(value = "/{id}/employees", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_FINANCE', 'ROLE_RECEPTION')")
    @Operation(summary = "Lister les agents d'une entreprise")
    public ResponseEntity<ApiResponse<List<CompanyEmployeeResponse>>> getEmployees(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(companyService.getEmployeesByCompany(id)));
    }

    @PostMapping(value = "/{id}/employees", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Ajouter un agent à une entreprise")
    public ResponseEntity<ApiResponse<CompanyEmployeeResponse>> addEmployee(
            @PathVariable Long id,
            @Valid @RequestBody CompanyEmployeeRequest request) {
        CompanyEmployeeResponse created = companyService.addEmployee(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Agent ajouté avec succès", created));
    }

    @DeleteMapping(value = "/{id}/employees/{employeeId}", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Retirer un agent d'une entreprise")
    public ResponseEntity<ApiResponse<Void>> deleteEmployee(
            @PathVariable Long id,
            @PathVariable Long employeeId) {
        companyService.deleteEmployee(id, employeeId);
        return ResponseEntity.ok(ApiResponse.success("Agent retiré", null));
    }

    /**
     * Endpoint utilitaire : vérifie si un patient est un abonné actif et retourne son agent.
     * Utilisé par la réception pendant l'admission pour basculer en mode "ABONNÉ".
     */
    @GetMapping(value = "/employees/by-patient/{patientId}", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_FINANCE', 'ROLE_RECEPTION')")
    @Operation(summary = "Récupérer l'agent actif d'un patient")
    public ResponseEntity<ApiResponse<CompanyEmployeeResponse>> findEmployeeByPatient(@PathVariable Long patientId) {
        CompanyEmployeeResponse e = companyService.findActiveEmployeeByPatient(patientId);
        return ResponseEntity.ok(ApiResponse.success(e));
    }

    // ============================== RAPPORTS & PDF ==============================

    @GetMapping(value = "/{id}/consumption-sheet", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_FINANCE')")
    @Operation(summary = "Télécharger la feuille de consommation mensuelle (PDF)")
    public ResponseEntity<byte[]> downloadConsumptionSheet(
            @PathVariable Long id,
            @RequestParam("month") String month) {
        byte[] pdf = companyService.generateMonthlyConsumptionSheet(id, month);
        String filename = "feuille-consommation-" + id + "-" + month + ".pdf";
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping(value = "/{id}/consumption-records", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_FINANCE')")
    @Operation(summary = "Liste détaillée des enregistrements de consommation pour un mois")
    public ResponseEntity<ApiResponse<List<ConsumptionRecordDTO>>> getConsumptionRecords(
            @PathVariable Long id,
            @RequestParam("month") String month) {
        return ResponseEntity.ok(ApiResponse.success(
                companyService.getConsumptionRecords(id, month)));
    }

    @GetMapping(value = "/{id}/patient-summaries", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_FINANCE')")
    @Operation(summary = "Résumé de consommation par patient (admissions + flux CONSULTATION/LABO/PHARMACIE)")
    public ResponseEntity<ApiResponse<List<PatientConsumptionSummaryDTO>>> getPatientSummaries(
            @PathVariable Long id,
            @RequestParam("month") String month) {
        return ResponseEntity.ok(ApiResponse.success(
                companyService.getPatientConsumptionSummaries(id, month)));
    }

    @GetMapping(value = "/{id}/stats", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_FINANCE')")
    @Operation(summary = "Statistiques de l'entreprise")
    public ResponseEntity<ApiResponse<CompanyStatsDTO>> getStats(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(companyService.getCompanyStats(id)));
    }

    @GetMapping(value = "/stats/all", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_FINANCE')")
    @Operation(summary = "Statistiques de toutes les entreprises abonnées pour un mois donné")
    public ResponseEntity<ApiResponse<List<CompanyStatsDTO>>> getAllStats(
            @RequestParam(required = false) String month) {
        return ResponseEntity.ok(ApiResponse.success(companyService.getAllCompaniesStats(month)));
    }
}
