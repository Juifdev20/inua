package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.entity.Invoice;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.InvoiceRepository;
import com.hospital.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/invoices/patient")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Patient Invoices", description = "Gestion des factures pour les patients")
public class PatientInvoiceController {

    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;

    /**
     * Récupère les factures du patient connecté
     */
    @GetMapping("/my-invoices")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mes factures", description = "Récupère la liste des factures du patient connecté")
    public ResponseEntity<ApiResponse<Page<Invoice>>> getMyInvoices(
            Principal principal,
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {
        
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Utilisateur non authentifié"));
        }
        
        String email = principal.getName();
        log.info("📋 [PATIENT INVOICE] Récupération des factures pour: {}", email);
        
        try {
            Page<Invoice> invoices = invoiceRepository.findByPatientEmailOrderByCreatedAtDesc(email, pageable);
            log.info("✅ [PATIENT INVOICE] {} factures trouvées", invoices.getTotalElements());
            return ResponseEntity.ok(ApiResponse.success(invoices));
        } catch (Exception e) {
            log.error("❌ [PATIENT INVOICE] Erreur: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Erreur lors de la récupération des factures"));
        }
    }

    /**
     * Récupère les statistiques des factures du patient connecté
     */
    @GetMapping("/stats")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Statistiques de mes factures", description = "Récupère les statistiques financières du patient connecté")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyInvoiceStats(Principal principal) {
        
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Utilisateur non authentifié"));
        }
        
        String email = principal.getName();
        log.info("📊 [PATIENT INVOICE] Récupération des stats pour: {}", email);
        
        try {
            // Récupérer l'utilisateur pour avoir le nom
            Optional<User> userOpt = userRepository.findByEmail(email);
            String patientName = userOpt.map(u -> u.getFirstName() + " " + u.getLastName()).orElse("Patient");
            
            // Statistiques
            long totalInvoices = invoiceRepository.countByPatientEmail(email);
            BigDecimal totalInvoiced = invoiceRepository.sumTotalInvoicedByPatientEmail(email);
            BigDecimal totalPaid = invoiceRepository.sumTotalPaidByPatientEmail(email);
            BigDecimal pendingAmount = invoiceRepository.sumPendingAmountByPatientEmail(email);
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("patientName", patientName);
            stats.put("patientEmail", email);
            stats.put("totalInvoices", totalInvoices);
            stats.put("totalInvoiced", totalInvoiced);
            stats.put("totalPaid", totalPaid);
            stats.put("pendingAmount", pendingAmount);
            stats.put("remainingAmount", totalInvoiced.subtract(totalPaid));
            
            log.info("✅ [PATIENT INVOICE] Stats calculées - Factures: {}, Total: {}, Payé: {}", 
                    totalInvoices, totalInvoiced, totalPaid);
            
            return ResponseEntity.ok(ApiResponse.success(stats));
        } catch (Exception e) {
            log.error("❌ [PATIENT INVOICE] Erreur stats: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Erreur lors du calcul des statistiques"));
        }
    }
}
