package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.entity.Examen;
import com.hospital.backend.service.ExamenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * ★ CONTROLLER POUR LA GESTION DES EXAMENS DE LABORATOIRE
 */
@RestController
@RequestMapping("/api/v1/examens")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Examens Laboratoire", description = "Gestion du catalogue d'examens biologiques")
@CrossOrigin(origins = {"https://inua-oux2.onrender.com", "https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class ExamenController {

    private final ExamenService examenService;

    /**
     * ★ Recherche d'examens par nom ou code
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('DOCTEUR', 'ADMIN', 'LABORATOIRE', 'RECEPTION', 'FINANCE')")
    @Operation(summary = "Rechercher des examens par nom ou code")
    public ResponseEntity<ApiResponse<List<Examen>>> searchExamens(
            @RequestParam(required = false) String query) {
        log.info("🔍 [EXAMEN CTRL] Recherche: '{}'", query);
        List<Examen> examens = examenService.searchExamens(query);
        return ResponseEntity.ok(ApiResponse.success(examens));
    }

    /**
     * Liste tous les examens actifs
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('DOCTEUR', 'ADMIN', 'LABORATOIRE', 'RECEPTION', 'FINANCE')")
    @Operation(summary = "Liste tous les examens actifs")
    public ResponseEntity<ApiResponse<List<Examen>>> getAllExamens() {
        List<Examen> examens = examenService.getAllActiveExamens();
        return ResponseEntity.ok(ApiResponse.success(examens));
    }

    /**
     * Récupère un examen par ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTEUR', 'ADMIN', 'LABORATOIRE')")
    @Operation(summary = "Récupérer un examen par ID")
    public ResponseEntity<ApiResponse<Examen>> getExamenById(@PathVariable Long id) {
        Examen examen = examenService.getExamenById(id)
                .orElseThrow(() -> new RuntimeException("Examen non trouvé: " + id));
        return ResponseEntity.ok(ApiResponse.success(examen));
    }

    /**
     * Récupère les examens par catégorie
     */
    @GetMapping("/categorie/{categorie}")
    @PreAuthorize("hasAnyRole('DOCTEUR', 'ADMIN', 'LABORATOIRE')")
    @Operation(summary = "Récupérer les examens par catégorie")
    public ResponseEntity<ApiResponse<List<Examen>>> getExamensByCategorie(
            @PathVariable String categorie) {
        List<Examen> examens = examenService.getExamensByCategorie(categorie);
        return ResponseEntity.ok(ApiResponse.success(examens));
    }

    /**
     * Crée un nouvel examen (ADMIN uniquement)
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Créer un nouvel examen")
    public ResponseEntity<ApiResponse<Examen>> createExamen(@RequestBody Examen examen) {
        log.info("🧪 [EXAMEN CTRL] Création de l'examen: {} ({}) - Prix: {}", 
                examen.getNom(), examen.getCode(), examen.getPrix());
        Examen created = examenService.createExamen(examen);
        return ResponseEntity.ok(ApiResponse.success("Examen créé avec succès", created));
    }

    /**
     * Met à jour un examen (ADMIN uniquement)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mettre à jour un examen")
    public ResponseEntity<ApiResponse<Examen>> updateExamen(
            @PathVariable Long id,
            @RequestBody Examen examen) {
        Examen updated = examenService.updateExamen(id, examen);
        return ResponseEntity.ok(ApiResponse.success("Examen mis à jour", updated));
    }

    /**
     * Désactive un examen (ADMIN uniquement)
     */
    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Désactiver un examen")
    public ResponseEntity<ApiResponse<Void>> deactivateExamen(@PathVariable Long id) {
        examenService.deactivateExamen(id);
        return ResponseEntity.ok(ApiResponse.success("Examen désactivé", null));
    }

    /**
     * Supprime un examen (ADMIN uniquement)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un examen")
    public ResponseEntity<ApiResponse<Void>> deleteExamen(@PathVariable Long id) {
        examenService.deleteExamen(id);
        return ResponseEntity.ok(ApiResponse.success("Examen supprimé", null));
    }

    /**
     * Calcule le prix total pour une liste d'IDs d'examens
     */
    @PostMapping("/calculate-total")
    @PreAuthorize("hasAnyRole('DOCTEUR', 'ADMIN', 'FINANCE')")
    @Operation(summary = "Calculer le prix total des examens")
    public ResponseEntity<ApiResponse<BigDecimal>> calculateTotal(
            @RequestBody List<Long> examenIds) {
        BigDecimal total = examenService.calculateTotalPrice(examenIds);
        return ResponseEntity.ok(ApiResponse.success(total));
    }
}
