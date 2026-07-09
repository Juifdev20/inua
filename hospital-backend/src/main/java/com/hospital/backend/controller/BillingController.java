package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.dto.PaymentRequestDTO;
import com.hospital.backend.security.HospitalTenantContext;
import com.hospital.backend.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 💳 BillingController — page « Facturation » de l'admin d'un hôpital.
 * Consultation de l'abonnement, de l'historique des paiements, et renouvellement.
 * Le hospitalId provient du contexte multi-tenant (JWT) : un admin ne voit
 * QUE l'abonnement de son propre établissement.
 */
@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Billing", description = "Abonnement & facturation de l'hôpital")
public class BillingController {

    private final SubscriptionService subscriptionService;

    private Long currentHospitalId() {
        Long id = HospitalTenantContext.getHospitalId();
        if (id == null || id < 0) {
            throw new com.hospital.backend.exception.BadRequestException(
                    "Aucun établissement associé à votre compte");
        }
        return id;
    }

    @GetMapping("/pricing")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Tarifs des abonnements")
    public ResponseEntity<?> getPricing() {
        return ResponseEntity.ok(ApiResponse.success("Tarifs", subscriptionService.getPublicPricing()));
    }

    @GetMapping("/subscription")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "État de l'abonnement de mon hôpital")
    public ResponseEntity<?> getSubscription() {
        try {
            return ResponseEntity.ok(ApiResponse.success("Abonnement",
                    subscriptionService.getHospitalSubscription(currentHospitalId())));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/payments")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Historique des paiements de mon hôpital")
    public ResponseEntity<?> getPayments() {
        try {
            return ResponseEntity.ok(ApiResponse.success("Historique",
                    subscriptionService.getPaymentsForHospital(currentHospitalId())));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/pay")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Payer / renouveler l'abonnement (simulation)")
    public ResponseEntity<?> pay(@RequestBody PaymentRequestDTO req) {
        try {
            req.setHospitalId(currentHospitalId()); // sécurité : on force l'hôpital du contexte
            var payment = subscriptionService.submitPayment(req);
            return ResponseEntity.status(201).body(ApiResponse.success(
                    "Paiement enregistré. En attente de confirmation.",
                    Map.of("reference", payment.getReference(), "amount", payment.getAmount(),
                            "currency", payment.getCurrency(), "status", payment.getStatus())));
        } catch (Exception e) {
            log.error("[Billing] Erreur paiement: {}", e.getMessage());
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage()));
        }
    }
}
