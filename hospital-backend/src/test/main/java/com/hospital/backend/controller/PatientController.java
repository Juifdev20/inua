package com.hospital.backend.controller;

import com.hospital.backend.dto.*;
import com.hospital.backend.service.PatientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping({"/api/patients", "/api/v1/patients", "/patients"})
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Patients", description = "Gestion des dossiers patients")
public class PatientController {

    private final PatientService patientService;

    /**
     * ✅ Récupère le profil du patient connecté
     */
    @GetMapping(value = "/me", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mon profil patient", description = "Récupère les informations du patient actuellement connecté")
    public ResponseEntity<ApiResponse<PatientDTO>> getCurrentPatientProfile(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        PatientDTO patient = patientService.getByEmail(principal.getName());
        return ResponseEntity.ok(ApiResponse.success(patient));
    }

    /**
     * ✅ Mise à jour du profil par le patient lui-même
     */
    @PutMapping(value = "/me", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Modifier mon profil", description = "Le patient connecté modifie ses propres informations")
    public ResponseEntity<ApiResponse<PatientDTO>> updateMyProfile(
            @Valid @RequestBody PatientDTO patientDTO,
            Principal principal) {
        PatientDTO updated = patientService.updateByEmail(principal.getName(), patientDTO);
        return ResponseEntity.ok(ApiResponse.success("Votre profil a été mis à jour", updated));
    }

    /**
     * ✅ Paramétrage du compte : Changement de mot de passe
     */
    @PostMapping(value = "/change-password", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Changer le mot de passe", description = "Permet au patient de modifier son mot de passe de sécurité")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Principal principal) {
        patientService.updatePassword(principal.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Mot de passe modifié avec succès", null));
    }

    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION')")
    @Operation(summary = "Créer un patient", description = "Enregistre un nouveau patient")
    public ResponseEntity<ApiResponse<PatientDTO>> create(@Valid @RequestBody PatientDTO patientDTO) {
        PatientDTO created = patientService.create(patientDTO);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Patient créé avec succès", created));
    }

    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'DOCTEUR') or isAuthenticated()")
    @Operation(summary = "Obtenir un patient", description = "Récupère les détails d'un patient par son ID")
    public ResponseEntity<ApiResponse<PatientDTO>> getById(@PathVariable Long id) {
        PatientDTO patient = patientService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(patient));
    }

    @GetMapping(value = "/code/{patientCode}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Obtenir par code", description = "Récupère un patient par son code unique")
    public ResponseEntity<ApiResponse<PatientDTO>> getByCode(@PathVariable String patientCode) {
        PatientDTO patient = patientService.getByCode(patientCode);
        return ResponseEntity.ok(ApiResponse.success(patient));
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'DOCTEUR')")
    @Operation(summary = "Lister les patients", description = "Récupère la liste paginée des patients")
    public ResponseEntity<ApiResponse<PageResponse<PatientDTO>>> getAll(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<PatientDTO> patients = patientService.getAll(pageable);
        return ResponseEntity.ok(ApiResponse.success(patients));
    }

    @GetMapping(value = "/search", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'DOCTEUR')")
    @Operation(summary = "Rechercher des patients", description = "Recherche par nom, code ou téléphone")
    public ResponseEntity<ApiResponse<PageResponse<PatientDTO>>> search(
            @RequestParam String query,
            @PageableDefault(size = 20) Pageable pageable) {
        PageResponse<PatientDTO> patients = patientService.search(query, pageable);
        return ResponseEntity.ok(ApiResponse.success(patients));
    }

    // --- MODIFICATION ICI : Ajout de ROLE_PATIENT ---
    @PutMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'PATIENT')")
    @Operation(summary = "Modifier un patient", description = "Met à jour un dossier patient")
    public ResponseEntity<ApiResponse<PatientDTO>> update(
            @PathVariable Long id,
            @Valid @RequestBody PatientDTO patientDTO) {
        PatientDTO updated = patientService.update(id, patientDTO);
        return ResponseEntity.ok(ApiResponse.success("Dossier patient mis à jour", updated));
    }

    @DeleteMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un patient", description = "Supprime définitivement un patient")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        patientService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Patient supprimé", null));
    }

    @PatchMapping(value = "/{id}/deactivate", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION')")
    @Operation(summary = "Désactiver un patient", description = "Désactive le compte d'un patient")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        patientService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Patient désactivé", null));
    }

    @GetMapping(value = "/count", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Compter les patients actifs", description = "Retourne le nombre de patients actifs")
    public ResponseEntity<ApiResponse<Long>> countActive() {
        Long count = patientService.countActive();
        return ResponseEntity.ok(ApiResponse.success(count));
    }
}