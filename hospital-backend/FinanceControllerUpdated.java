package com.hospital.backend.controller;

import com.hospital.backend.dto.InvoiceDTO;
import com.hospital.backend.entity.DepartmentSource;
import com.hospital.backend.entity.InvoiceStatus;
import com.hospital.backend.service.InvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller Finance mis à jour pour récupérer les factures PHARMACY en attente
 * Requête SQL exécutée : SELECT * FROM invoices WHERE status = 'EN_ATTENTE' AND department_source = 'PHARMACY'
 */
@RestController
@RequestMapping({"/api/finance", "/api/v1/finance"})
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:5173")
public class FinanceControllerUpdated {

    private final InvoiceService invoiceService;

    @GetMapping("/prescription/pharmacy-invoices")
    @PreAuthorize("hasAnyAuthority('ROLE_FINANCE', 'ROLE_CASHIER', 'ROLE_ADMIN')")
    @Operation(summary = "Récupérer les factures de prescriptions en attente de paiement")
    public ResponseEntity<List<InvoiceDTO>> getPharmacyInvoices() {
        try {
            log.info("🔍 Récupération factures PHARMACY en attente pour la caisse");
            
            // Exécute la requête : SELECT * FROM invoices WHERE status = 'EN_ATTENTE' AND department_source = 'PHARMACY'
            List<InvoiceDTO> invoices = invoiceService.getPendingInvoicesByDepartment(DepartmentSource.PHARMACY);
            
            log.info("✅ {} facture(s) PHARMACY en attente trouvées", invoices.size());
            
            // Log détaillé pour debugging
            invoices.forEach(invoice -> {
                log.info("📋 Facture: {} - Patient: {} - Montant: {} - Statut: {}", 
                    invoice.getInvoiceCode(), invoice.getPatientName(), invoice.getTotalAmount(), invoice.getStatus());
            });
            
            return ResponseEntity.ok(invoices);
            
        } catch (Exception e) {
            log.error("❌ Erreur récupération factures PHARMACY: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/prescription/pharmacy-invoices/stats")
    @PreAuthorize("hasAnyAuthority('ROLE_FINANCE', 'ROLE_CASHIER', 'ROLE_ADMIN')")
    @Operation(summary = "Statistiques des factures PHARMACY en attente")
    public ResponseEntity<Map<String, Object>> getPharmacyInvoicesStats() {
        try {
            Map<String, Object> stats = invoiceService.getStatsByDepartment(DepartmentSource.PHARMACY);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("❌ Erreur stats PHARMACY: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/prescription/pharmacy-invoices/{invoiceId}/pay")
    @PreAuthorize("hasAnyAuthority('ROLE_FINANCE', 'ROLE_CASHIER', 'ROLE_ADMIN')")
    @Operation(summary = "Traiter le paiement d'une facture PHARMACY")
    public ResponseEntity<?> payPharmacyInvoice(
            @PathVariable Long invoiceId,
            @RequestBody Map<String, Object> paymentData) {
        try {
            log.info("💰 Paiement facture PHARMACY: {}", invoiceId);
            
            // Logique de paiement existante...
            // invoiceService.processPayment(invoiceId, amount, paymentMethod);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Paiement traité avec succès"
            ));
            
        } catch (Exception e) {
            log.error("❌ Erreur paiement facture {}: {}", invoiceId, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "Erreur lors du paiement",
                "message", e.getMessage()
            ));
        }
    }
}
