package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.dto.FinanceDashboardDTO;
import com.hospital.backend.service.FinanceDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Contrôleur pour le tableau de bord financier
 * Fournit des statistiques complètes avec séparation CDF/USD
 */
@RestController
@RequestMapping("/api/finance/dashboard")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Dashboard Finance", description = "Tableau de bord financier temps réel avec statistiques par devise")
@SecurityRequirement(name = "bearerAuth")
@CrossOrigin(origins = "*")
public class FinanceDashboardController {

    private final FinanceDashboardService dashboardService;

    /**
     * Endpoint principal du tableau de bord financier
     * Retourne toutes les statistiques séparées par devise (CDF et USD)
     */
    @GetMapping
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(
        summary = "Tableau de bord financier complet",
        description = "Retourne toutes les statistiques financières avec séparation par devise (CDF et USD). " +
                     "Inclut: revenus journaliers/mensuels/totaux, dépenses, solde net, répartition par source/catégorie, " +
                     "évolution sur 6 mois et transactions récentes."
    )
    public ResponseEntity<ApiResponse<FinanceDashboardDTO>> getDashboard() {
        log.info("📊 [API] GET /api/finance/dashboard - Récupération du tableau de bord financier");

        try {
            FinanceDashboardDTO dashboard = dashboardService.getDashboard();

            return ResponseEntity.ok(ApiResponse.success(
                "Tableau de bord financier chargé avec succès",
                dashboard
            ));
        } catch (Exception e) {
            log.error("❌ [API] Erreur lors de la génération du dashboard: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Erreur lors de la génération du tableau de bord: " + e.getMessage()));
        }
    }

    /**
     * Endpoint pour synchroniser/réactualiser les données du dashboard
     */
    @PostMapping("/sync")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(
        summary = "Synchroniser le tableau de bord",
        description = "Force le recalcul et la mise à jour des statistiques du tableau de bord"
    )
    public ResponseEntity<ApiResponse<FinanceDashboardDTO>> syncDashboard() {
        log.info("🔄 [API] POST /api/finance/dashboard/sync - Synchronisation du dashboard");

        // Pour l'instant, même logique que GET (peut être optimisé avec cache plus tard)
        return getDashboard();
    }
}
