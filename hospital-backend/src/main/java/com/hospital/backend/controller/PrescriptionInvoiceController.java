package com.hospital.backend.controller;

import com.hospital.backend.dto.InvoiceDTO;
import com.hospital.backend.entity.PaymentMethod;
import com.hospital.backend.entity.DepartmentSource;
import com.hospital.backend.entity.User;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.service.InvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping({"/api/finance/prescription", "/api/v1/finance/prescription"})
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Prescription Invoice", description = "Gestion des factures de prescriptions")
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class PrescriptionInvoiceController {

    private final InvoiceService invoiceService;
    private final UserRepository userRepository;

    @PostMapping("/create-invoice")
    @PreAuthorize("hasAnyRole('PHARMACIST', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Créer une facture à partir d'une prescription validée")
    public ResponseEntity<?> createPrescriptionInvoice(@RequestParam Long prescriptionId) {
        try {
            log.info("🔍 [DEBUG] Création de facture pour la prescription ID: {}", prescriptionId);
            
            // Récupérer l'utilisateur connecté (pour l'instant, utilisateur par défaut)
            User createdBy = userRepository.findById(1L)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
            
            log.info("🔍 [DEBUG] Utilisateur trouvé: {}", createdBy.getUsername());
            
            InvoiceDTO invoice = invoiceService.createPrescriptionInvoice(prescriptionId, createdBy);
            log.info("✅ [DEBUG] Facture créée avec succès: {} - Statut: {} - Département: {}", 
                invoice.getInvoiceCode(), invoice.getStatus(), invoice.getDepartmentSource());
            return ResponseEntity.status(HttpStatus.CREATED).body(invoice);
        } catch (ResourceNotFoundException e) {
            log.error("❌ [DEBUG] Ressource non trouvée: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "Ressource non trouvée",
                "message", e.getMessage()
            ));
        } catch (RuntimeException e) {
            log.error("❌ [DEBUG] Erreur métier: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Erreur métier",
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("❌ [DEBUG] Erreur inattendue lors de la création de la facture de prescription: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Erreur serveur",
                "message", "Une erreur inattendue est survenue: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/process-payment/{invoiceId}")
    @PreAuthorize("hasAnyRole('CASHIER', 'ADMIN')")
    @Operation(summary = "Traiter le paiement d'une facture de prescription avec mise à jour du stock")
    public ResponseEntity<?> processPrescriptionPayment(
            @PathVariable Long invoiceId,
            @RequestParam PaymentMethod paymentMethod) {
        try {
            log.info("Traitement du paiement pour la facture ID: {} avec méthode: {}", invoiceId, paymentMethod);
            
            InvoiceDTO invoice = invoiceService.processPrescriptionPayment(invoiceId, paymentMethod);
            return ResponseEntity.ok(invoice);
        } catch (RuntimeException e) {
            log.error("Erreur lors du paiement de la prescription: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Erreur lors du paiement",
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Erreur inattendue lors du paiement: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Erreur serveur",
                "message", "Une erreur inattendue est survenue"
            ));
        }
    }

    @GetMapping("/test")
    @Operation(summary = "Endpoint de test simple")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("Endpoint fonctionne !");
    }

    @GetMapping("/debug-roles")
    @Operation(summary = "Afficher les rôles de l'utilisateur connecté")
    public ResponseEntity<Map<String, Object>> debugRoles() {
        try {
            // Récupérer l'authentification actuelle
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            
            Map<String, Object> debug = new HashMap<>();
            debug.put("username", auth.getName());
            debug.put("authorities", auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList()));
            debug.put("isAuthenticated", auth.isAuthenticated());
            debug.put("principal", auth.getPrincipal().getClass().getSimpleName());
            
            return ResponseEntity.ok(debug);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "error", "Erreur: " + e.getMessage(),
                "auth", SecurityContextHolder.getContext().getAuthentication()
            ));
        }
    }

    @GetMapping("/pharmacy-invoices-public")
    @Operation(summary = "Lister les factures de prescriptions (endpoint public pour debug)")
    public ResponseEntity<List<InvoiceDTO>> getPharmacyInvoicesPublic() {
        try {
            log.info("🔍 [DEBUG] Récupération des factures de pharmacie (public)");
            List<InvoiceDTO> invoices = invoiceService.getPendingInvoicesByDepartment(DepartmentSource.PHARMACY);
            log.info("✅ [DEBUG] {} facture(s) en attente trouvées pour PHARMACY", invoices.size());
            return ResponseEntity.ok(invoices);
        } catch (Exception e) {
            log.error("❌ [DEBUG] Erreur lors de la récupération des factures de pharmacie: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/pharmacy-invoices")
    @PreAuthorize("hasAnyAuthority('ROLE_CASHIER', 'ROLE_PHARMACIST', 'ROLE_PHARMACY', 'ROLE_ADMIN', 'ROLE_FINANCE', 'ROLE_CAISSIER')")
    @Operation(summary = "Lister les factures de prescriptions en attente de paiement pour la caisse")
    public ResponseEntity<List<InvoiceDTO>> getPharmacyInvoices() {
        try {
            log.info("🔍 [DEBUG] Récupération des factures de pharmacie pour la caisse");
            List<InvoiceDTO> invoices = invoiceService.getPendingInvoicesByDepartment(DepartmentSource.PHARMACY);
            
            // S'assurer que la liste n'est jamais null
            if (invoices == null) {
                invoices = new ArrayList<>();
                log.warn("⚠️ [DEBUG] La liste des factures était null, initialisation à vide");
            }
            
            log.info("✅ [DEBUG] {} facture(s) en attente trouvées pour PHARMACY", invoices.size());
            for (InvoiceDTO invoice : invoices) {
                log.info("📋 [DEBUG] Facture: {} - Patient: {} - Montant: {} - Statut: {}", 
                    invoice.getInvoiceCode(), invoice.getPatientName(), invoice.getTotalAmount(), invoice.getStatus());
            }
            
            return ResponseEntity.ok(invoices);
        } catch (Exception e) {
            log.error("❌ [DEBUG] Erreur lors de la récupération des factures de pharmacie: {}", e.getMessage(), e);
            // Retourner une liste vide même en cas d'erreur pour éviter de faire bugger React
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('CASHIER', 'PHARMACIST', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Lister les factures de prescriptions en attente de paiement")
    public ResponseEntity<List<InvoiceDTO>> getPendingPrescriptionInvoices() {
        try {
            log.info("🔍 [DEBUG] Récupération des factures de prescriptions en attente");
            List<InvoiceDTO> invoices = invoiceService.getPendingInvoicesByDepartment(DepartmentSource.PHARMACY);
            log.info("✅ [DEBUG] {} facture(s) en attente trouvées pour PHARMACY", invoices.size());
            for (InvoiceDTO invoice : invoices) {
                log.info("📋 [DEBUG] Facture: {} - Patient: {} - Montant: {} - Statut: {}", 
                    invoice.getInvoiceCode(), invoice.getPatientName(), invoice.getTotalAmount(), invoice.getStatus());
            }
            return ResponseEntity.ok(invoices);
        } catch (Exception e) {
            log.error("❌ [DEBUG] Erreur lors de la récupération des factures en attente: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'PHARMACIST', 'PHARMACIE')")
    @Operation(summary = "Statistiques des ventes de la pharmacie")
    public ResponseEntity<Map<String, Object>> getPharmacyStats() {
        try {
            log.info("Récupération des statistiques de la pharmacie");
            Map<String, Object> stats = invoiceService.getStatsByDepartment(DepartmentSource.PHARMACY);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des statistiques: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
