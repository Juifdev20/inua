package com.hospital.backend.controller;

import com.hospital.backend.dto.InvoiceDTO;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 🛠️ CONTROLLER DEBUG - Création manuelle de facture pour test
 * À supprimer après correction du déploiement automatique
 */
@RestController
@RequestMapping("/api/debug/invoice")
@RequiredArgsConstructor
@Slf4j
public class InvoiceDebugController {

    private final InvoiceService invoiceService;
    private final UserRepository userRepository;

    @PostMapping("/create-from-prescription")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'DOCTEUR', 'FINANCE', 'CAISSE')")
    public ResponseEntity<?> createInvoiceFromPrescription(@RequestParam Long prescriptionId) {
        log.info("🛠️ [DEBUG] Création manuelle de facture pour prescription: {}", prescriptionId);
        
        try {
            // Utiliser l'utilisateur système (ID 1) comme créateur
            User systemUser = userRepository.findById(1L)
                .orElseThrow(() -> new RuntimeException("Utilisateur système non trouvé"));
            
            InvoiceDTO invoice = invoiceService.createPrescriptionInvoice(prescriptionId, systemUser);
            
            log.info("✅ [DEBUG] Facture créée: {} - Montant: {}", 
                invoice.getInvoiceCode(), invoice.getTotalAmount());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Facture créée avec succès");
            response.put("invoice", invoice);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ [DEBUG] Erreur création facture: {}", e.getMessage(), e);
            
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            
            return ResponseEntity.badRequest().body(error);
        }
    }
}
