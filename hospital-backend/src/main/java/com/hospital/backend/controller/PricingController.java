package com.hospital.backend.controller;

import com.hospital.backend.dto.AdmissionPricingDTO;
import com.hospital.backend.entity.MedicalService;
import com.hospital.backend.repository.MedicalServiceRepository;
import com.hospital.backend.service.PricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller pour la gestion des tarifs et calculs de prix
 */
@RestController
@RequestMapping("/api/v1/pricing")
@RequiredArgsConstructor
@Slf4j
public class PricingController {

    private final PricingService pricingService;
    private final MedicalServiceRepository medicalServiceRepository;

    /**
     * GET /api/v1/pricing/prices
     * Récupère tous les prix actifs de la grille tarifaire
     */
    @GetMapping("/prices")
    public ResponseEntity<Map<String, Object>> getAllPrices() {
        try {
            List<Map<String, Object>> prices = pricingService.getAllActivePrices();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "content", prices,
                "count", prices.size()
            ));
        } catch (Exception e) {
            log.error("❌ Erreur lors de la récupération des prix: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * GET /api/v1/pricing/admission/calculate
     * Calcule les montants pour une admission
     * Paramètres: patientId, serviceId
     */
    @GetMapping("/admission/calculate")
    public ResponseEntity<Map<String, Object>> calculateAdmissionPrice(
            @RequestParam Long patientId,
            @RequestParam(required = false) Long serviceId) {
        try {
            log.info("💰 Calcul des montants pour patientId: {}, serviceId: {}", patientId, serviceId);
            
            // 1. Vérifier si le patient a une fiche active
            boolean hasActiveFile = pricingService.hasActiveFile(patientId);
            
            // 2. Récupérer le montant de la fiche
            BigDecimal ficheAmount = pricingService.getFicheAmount(patientId);
            
            // 3. Récupérer le prix de la consultation depuis MedicalService
            BigDecimal consulAmount = BigDecimal.ZERO;
            String serviceName = "";
            BigDecimal consulUnitPrice = BigDecimal.ZERO;
            
            if (serviceId != null) {
                MedicalService service = medicalServiceRepository.findById(serviceId).orElse(null);
                if (service != null) {
                    consulAmount = BigDecimal.valueOf(service.getPrix() != null ? service.getPrix() : 0);
                    consulUnitPrice = consulAmount;
                    serviceName = service.getNom();
                }
            }
            
            // 4. Calculer le total
            BigDecimal totalAmount = ficheAmount.add(consulAmount);
            
            // 5. Préparer le message
            String message = hasActiveFile 
                ? "Patient ancien - Fiche exonérée (valide 12 mois)"
                : "Nouveau patient - Frais de dossier requis";
            
            // Construire la réponse
            AdmissionPricingDTO pricing = AdmissionPricingDTO.builder()
                .patientId(patientId)
                .serviceId(serviceId)
                .ficheAmount(ficheAmount)
                .consulAmount(consulAmount)
                .totalAmount(totalAmount)
                .ficheRequired(!hasActiveFile)
                .hasActiveFile(hasActiveFile)
                .serviceName(serviceName)
                .ficheUnitPrice(ficheAmount)
                .consulUnitPrice(consulUnitPrice)
                .message(message)
                .build();
            
            log.info("✅ Montants calculés - Fiche: {}, Consultation: {}, Total: {}", 
                ficheAmount, consulAmount, totalAmount);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "content", pricing
            ));
            
        } catch (Exception e) {
            log.error("❌ Erreur lors du calcul des montants: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * GET /api/v1/pricing/patient/{patientId}/fiche-status
     * Vérifie le statut de la fiche patient
     */
    @GetMapping("/patient/{patientId}/fiche-status")
    public ResponseEntity<Map<String, Object>> getPatientFicheStatus(@PathVariable Long patientId) {
        try {
            boolean hasActiveFile = pricingService.hasActiveFile(patientId);
            BigDecimal ficheAmount = pricingService.getFicheAmount(patientId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("hasActiveFile", hasActiveFile);
            response.put("ficheAmount", ficheAmount);
            response.put("ficheRequired", !hasActiveFile);
            
            // Ajouter la date de dernier paiement si disponible
            var lastPaymentDate = pricingService.getLastFichePaymentDate(patientId);
            if (lastPaymentDate != null) {
                response.put("lastPaymentDate", lastPaymentDate);
                response.put("ficheValidUntil", lastPaymentDate.plusMonths(12));
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "content", response
            ));
            
        } catch (Exception e) {
            log.error("❌ Erreur lors de la vérification du statut fiche: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * POST /api/v1/pricing/prices
     * Crée un nouveau prix dans la grille tarifaire
     */
    @PostMapping("/prices")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    public ResponseEntity<Map<String, Object>> createPrice(@RequestBody Map<String, Object> priceData) {
        try {
            Map<String, Object> price = pricingService.createPrice(priceData);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "content", price
            ));
        } catch (Exception e) {
            log.error("❌ Erreur lors de la création du prix: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * PUT /api/v1/pricing/prices/{id}
     * Met à jour un prix existant
     */
    @PutMapping("/prices/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    public ResponseEntity<Map<String, Object>> updatePrice(
            @PathVariable Long id,
            @RequestBody Map<String, Object> priceData) {
        try {
            BigDecimal newPrice = new BigDecimal(priceData.get("unitPrice").toString());
            Map<String, Object> price = pricingService.updatePrice(id, newPrice);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "content", price
            ));
        } catch (Exception e) {
            log.error("❌ Erreur lors de la mise à jour du prix: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * POST /api/v1/pricing/prices/initialize
     * Initialise la grille tarifaire avec les valeurs par défaut
     */
    @PostMapping("/prices/initialize")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> initializePrices() {
        try {
            pricingService.initializeDefaultPrices();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Grille tarifaire initialisée avec succès"
            ));
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'initialisation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
}

