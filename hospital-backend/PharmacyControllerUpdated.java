package com.hospital.backend.controller;

import com.hospital.backend.dto.PrescriptionDTO;
import com.hospital.backend.entity.PrescriptionStatus;
import com.hospital.backend.service.PrescriptionInvoiceService;
import com.hospital.backend.service.PrescriptionService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller Pharmacy mis à jour avec la liaison Prescription → Facture
 */
@RestController
@RequestMapping({"/api/pharmacy", "/api/v1/pharmacy"})
@RequiredArgsConstructor
@Slf4j
public class PharmacyControllerUpdated {

    private final PrescriptionService prescriptionService;
    private final PrescriptionInvoiceService prescriptionInvoiceService;

    @PostMapping("/prescriptions/{prescriptionId}/validate")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN')")
    @Operation(summary = "Valider une prescription ET générer automatiquement la facture")
    public ResponseEntity<?> validatePrescriptionAndCreateInvoice(@PathVariable Long prescriptionId) {
        try {
            log.info("🔍 Début validation prescription {} avec génération facture", prescriptionId);
            
            // 1. Valider la prescription (statut VALIDEE)
            PrescriptionDTO validatedPrescription = prescriptionService.updateStatus(prescriptionId, PrescriptionStatus.VALIDEE);
            log.info("✅ Prescription {} validée avec succès", prescriptionId);
            
            // 2. Récupérer l'entité prescription pour la facture
            var prescription = prescriptionService.findById(prescriptionId);
            
            // 3. Générer automatiquement la facture
            var invoice = prescriptionInvoiceService.generateInvoiceFromPrescription(prescription);
            
            log.info("🧾 Facture {} générée automatiquement - Montant: {} - Patient: {}", 
                invoice.getInvoiceCode(), invoice.getTotalAmount(), invoice.getPatientName());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Prescription validée et facture générée avec succès",
                "prescription", validatedPrescription,
                "invoice", invoice,
                "nextStep", "La facture est maintenant disponible dans la file d'attente Finance"
            ));
            
        } catch (Exception e) {
            log.error("❌ Erreur lors de la validation/génération facture pour prescription {}: {}", 
                prescriptionId, e.getMessage(), e);
            
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "Erreur lors de l'opération",
                "message", e.getMessage()
            ));
        }
    }
}
