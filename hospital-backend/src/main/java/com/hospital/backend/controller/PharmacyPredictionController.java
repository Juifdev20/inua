package com.hospital.backend.controller;

import com.hospital.backend.dto.PharmacyPredictionDTO;
import com.hospital.backend.service.PharmacyPredictionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Contrôleur pour le module de réapprovisionnement prédictif
 * Permet de calculer les quantités suggérées basées sur la consommation moyenne
 */
@RestController
@RequestMapping("/api/v1/pharmacy/predictions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Prédictions Pharmacie", description = "API pour le réapprovisionnement prédictif")
@CrossOrigin(origins = "*")
public class PharmacyPredictionController {

    private final PharmacyPredictionService predictionService;

    /**
     * Récupère les prédictions de réapprovisionnement
     * 
     * @param months Nombre de mois à couvrir (défaut: 3)
     * @param supplier Fournisseur à filtrer (optionnel)
     * @return Liste des prédictions avec métadonnées
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'PHARMACY_MANAGER', 'PHARMACIE', 'ROLE_PHARMACIE', 'PHARMACY', 'ROLE_PHARMACY')")
    @Operation(
        summary = "Calculer les prédictions de réapprovisionnement",
        description = "Retourne la liste des médicaments avec leurs quantités suggérées basées sur la CMM"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Prédictions calculées avec succès"),
        @ApiResponse(responseCode = "403", description = "Accès refusé"),
        @ApiResponse(responseCode = "500", description = "Erreur serveur")
    })
    public ResponseEntity<Map<String, Object>> getPredictions(
            @Parameter(description = "Nombre de mois à couvrir", example = "3")
            @RequestParam(name = "months", defaultValue = "3") int months,
            
            @Parameter(description = "Filtrer par fournisseur (optionnel)", example = "Pharma-Plus")
            @RequestParam(name = "supplier", required = false) String supplier) {
        
        log.info("GET /api/v1/pharmacy/predictions - months={}, supplier={}", months, supplier);
        
        // Valider le paramètre months
        if (months < 1 || months > 24) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Le nombre de mois doit être entre 1 et 24"
            ));
        }
        
        // Calculer les prédictions
        List<PharmacyPredictionDTO> predictions;
        if (supplier != null && !supplier.isEmpty()) {
            predictions = predictionService.calculatePredictionsBySupplier(months, supplier);
        } else {
            predictions = predictionService.calculatePredictions(months);
        }
        
        // Calculer le budget total
        BigDecimal totalBudget = predictionService.calculateTotalBudget(predictions);
        
        // Compter par statut
        Map<String, Long> statusCounts = predictions.stream()
            .collect(java.util.stream.Collectors.groupingBy(
                p -> p.getStatus().name(), 
                java.util.stream.Collectors.counting()
            ));
        
        // Construire la réponse
        Map<String, Object> response = new HashMap<>();
        response.put("predictions", predictions);
        response.put("totalBudget", totalBudget);
        response.put("totalMedications", predictions.size());
        response.put("monthsToCover", months);
        response.put("statusCounts", statusCounts);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Récupère uniquement les médicaments en alerte (rupture imminente ou stock faible)
     */
    @GetMapping("/alerts")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'PHARMACY_MANAGER', 'PHARMACIE', 'ROLE_PHARMACIE', 'PHARMACY', 'ROLE_PHARMACY')")
    @Operation(
        summary = "Obtenir les alertes de stock",
        description = "Retourne uniquement les médicaments avec un statut critique ou faible"
    )
    public ResponseEntity<List<PharmacyPredictionDTO>> getStockAlerts(
            @RequestParam(name = "months", defaultValue = "3") int months) {
        
        log.info("GET /api/v1/pharmacy/predictions/alerts - months={}", months);
        
        List<PharmacyPredictionDTO> allPredictions = predictionService.calculatePredictions(months);
        
        List<PharmacyPredictionDTO> alerts = allPredictions.stream()
            .filter(p -> p.getStatus() == PharmacyPredictionDTO.PredictionStatus.RUPTURE_IMMINENTE
                      || p.getStatus() == PharmacyPredictionDTO.PredictionStatus.STOCK_FAIBLE)
            .toList();
        
        return ResponseEntity.ok(alerts);
    }

    /**
     * Récupère la liste des fournisseurs uniques
     */
    @GetMapping("/suppliers")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'PHARMACY_MANAGER', 'PHARMACIE', 'ROLE_PHARMACIE', 'PHARMACY', 'ROLE_PHARMACY')")
    @Operation(
        summary = "Liste des fournisseurs",
        description = "Retourne la liste des fournisseurs présents dans les prédictions"
    )
    public ResponseEntity<List<String>> getSuppliers(
            @RequestParam(name = "months", defaultValue = "3") int months) {
        
        log.info("GET /api/v1/pharmacy/predictions/suppliers");
        
        List<PharmacyPredictionDTO> predictions = predictionService.calculatePredictions(months);
        
        List<String> suppliers = predictions.stream()
            .map(PharmacyPredictionDTO::getSupplier)
            .filter(s -> s != null && !s.isEmpty())
            .distinct()
            .sorted()
            .toList();
        
        return ResponseEntity.ok(suppliers);
    }
}
