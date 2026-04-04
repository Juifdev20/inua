package com.hospital.backend.controller;

import com.hospital.backend.dto.*;
import com.hospital.backend.service.PatientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping({"/api/v1/patients", "/api/patients", "/v1/patients", "/patients"})
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Patients", description = "Gestion des dossiers patients")
public class PatientController {

    private final PatientService patientService;

    /**
     * ✅ PROTECTION CONTRE LES ERREURS DE CONVERSION
     * Cette méthode intercepte le processus de liaison (binding) pour dire à Spring
     * d'ignorer les champs de type List qui causent l'erreur de conversion String -> List.
     */
    @InitBinder
    public void initBinder(WebDataBinder binder) {
        // On interdit la liaison automatique de ces champs pour les requêtes Multipart
        binder.setDisallowedFields("consultations", "medicalRecords", "appointments");
    }

    /**
     * ✅ OPTIMISATION RÉCEPTION : Liste ultra-légère pour les sélections
     */
    @GetMapping(value = "/simple-list", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR')")
    @Operation(summary = "Liste simplifiée (Réception)", description = "Récupère ID et Nom complet pour le triage rapide")
    public ResponseEntity<ApiResponse<List<PatientSimpleDTO>>> getAllSimple() {
        List<PatientSimpleDTO> patients = patientService.getAllSimpleList();
        return ResponseEntity.ok(ApiResponse.success(patients));
    }

    /**
     * ✅ OPTIMISATION RÉCEPTION : Recherche ultra-légère
     */
    @GetMapping(value = "/simple-search", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR', 'ROLE_PHARMACIE')")
    @Operation(summary = "Recherche simplifiée", description = "Recherche rapide par nom ou code sans données lourdes")
    public ResponseEntity<ApiResponse<List<PatientSimpleDTO>>> searchSimple(@RequestParam String query) {
        List<PatientSimpleDTO> patients = patientService.searchSimple(query);
        return ResponseEntity.ok(ApiResponse.success(patients));
    }

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

    /**
     * ✅ Liste complète des patients (Format complet)
     */
    @GetMapping(value = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR')")
    @Operation(summary = "Liste complète", description = "Récupère tous les patients actifs au format complet")
    public ResponseEntity<ApiResponse<List<PatientDTO>>> getAllForList() {
        List<PatientDTO> patients = patientService.getAllList();
        return ResponseEntity.ok(ApiResponse.success(patients));
    }

    /**
     * ✅ CRÉATION PATIENT (SUPPORT MULTIPART)
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR')")
    @Operation(summary = "Créer un patient", description = "Enregistre un nouveau patient avec photo optionnelle")
    public ResponseEntity<ApiResponse<PatientDTO>> create(
            @ModelAttribute PatientDTO patientDTO, // Retrait du @Valid pour éviter les conflits de types
            @RequestPart(value = "photo", required = false) MultipartFile photo) {

        PatientDTO created = patientService.create(patientDTO, photo);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Patient créé avec succès", created));
    }

    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR', 'ROLE_PATIENT')")
    @Operation(summary = "Obtenir un patient", description = "Récupère les détails d'un patient par son ID")
    public ResponseEntity<ApiResponse<PatientDTO>> getById(@PathVariable Long id) {
        PatientDTO patient = patientService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(patient));
    }

    @GetMapping(value = "/code/{patientCode}", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR')")
    @Operation(summary = "Obtenir par code", description = "Récupère un patient par son code unique")
    public ResponseEntity<ApiResponse<PatientDTO>> getByCode(@PathVariable String patientCode) {
        PatientDTO patient = patientService.getByCode(patientCode);
        return ResponseEntity.ok(ApiResponse.success(patient));
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR')")
    @Operation(summary = "Lister les patients", description = "Récupère la liste paginée des patients actifs")
    public ResponseEntity<ApiResponse<PageResponse<PatientDTO>>> getAll(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<PatientDTO> patients = patientService.getAll(pageable);
        return ResponseEntity.ok(ApiResponse.success(patients));
    }

    @GetMapping(value = "/archived", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION')")
    @Operation(summary = "Lister les archives", description = "Récupère la liste paginée des patients désactivés")
    public ResponseEntity<ApiResponse<PageResponse<PatientDTO>>> getAllArchived(
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<PatientDTO> patients = patientService.getAllArchived(pageable);
        return ResponseEntity.ok(ApiResponse.success(patients));
    }

    @GetMapping(value = "/search", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR')")
    @Operation(summary = "Rechercher des patients", description = "Recherche par nom, code, téléphone ou profession")
    public ResponseEntity<ApiResponse<PageResponse<PatientDTO>>> search(
            @RequestParam String query,
            @PageableDefault(size = 20) Pageable pageable) {
        PageResponse<PatientDTO> patients = patientService.search(query, pageable);
        return ResponseEntity.ok(ApiResponse.success(patients));
    }

    /**
     * ✅ VERSION MISE À JOUR CORRIGÉE
     * Le combo @InitBinder + @ModelAttribute permet de recevoir le Triage sans crash.
     */
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR')")
    @Operation(summary = "Modifier un patient", description = "Met à jour un dossier patient (Triage ou Profil complet)")
    public ResponseEntity<ApiResponse<PatientDTO>> update(
            @PathVariable Long id,
            @ModelAttribute PatientDTO patientDTO, // Spring ignorera les listes grâce à l'InitBinder
            @RequestPart(value = "photo", required = false) MultipartFile photo) {

        log.info("Requête de mise à jour reçue pour le patient ID: {}", id);
        PatientDTO updated = patientService.update(id, patientDTO, photo);
        return ResponseEntity.ok(ApiResponse.success("Dossier patient mis à jour avec succès", updated));
    }

    @DeleteMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Supprimer un patient", description = "Supprime définitivement un patient")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        patientService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Patient supprimé définitivement", null));
    }

    @PatchMapping(value = "/{id}/deactivate", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION')")
    @Operation(summary = "Désactiver un patient", description = "Archive le dossier")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        patientService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Le dossier patient a été archivé", null));
    }

    @PatchMapping(value = "/{id}/activate", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION')")
    @Operation(summary = "Réactiver un patient", description = "Restaure un dossier archivé")
    public ResponseEntity<ApiResponse<Void>> activate(@PathVariable Long id) {
        patientService.activate(id);
        return ResponseEntity.ok(ApiResponse.success("Dossier patient restauré", null));
    }

    @GetMapping(value = "/count", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR')")
    public ResponseEntity<ApiResponse<Long>> countActive() {
        return ResponseEntity.ok(ApiResponse.success(patientService.countActive()));
    }

    @DeleteMapping(value = "/cleanup/no-photos", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> cleanupNoPhotos() {
        patientService.deleteAllWithoutPhotos();
        return ResponseEntity.ok(ApiResponse.success("Nettoyage effectué", null));
    }
}