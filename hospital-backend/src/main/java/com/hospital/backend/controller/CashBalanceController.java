package com.hospital.backend.controller;

import com.hospital.backend.service.CashBalanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/finance/cash-balance")
@RequiredArgsConstructor
@Tag(name = "Cash Balance", description = "Gestion des soldes de caisse par catégorie")
@SecurityRequirement(name = "bearerAuth")
public class CashBalanceController {

    private final CashBalanceService cashBalanceService;

    @GetMapping("/by-source")
    @PreAuthorize("hasRole('FINANCE')")
    @Operation(summary = "Obtenir les soldes par source")
    public ResponseEntity<Map<String, Object>> getBalancesBySource() {
        Map<String, Object> response = Map.of(
            "success", true,
            "balances", cashBalanceService.getBalanceBySource()
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/source/{source}")
    @PreAuthorize("hasRole('FINANCE')")
    @Operation(summary = "Obtenir le solde pour une source spécifique")
    public ResponseEntity<Map<String, Object>> getBalanceBySource(@PathVariable String source) {
        try {
            var revenueSource = com.hospital.backend.entity.Revenue.RevenueSource.valueOf(source.toUpperCase());
            BigDecimal balance = cashBalanceService.getBalanceBySource(revenueSource);
            Map<String, Object> response = Map.of(
                "success", true,
                "source", source,
                "balance", balance
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Source invalide: " + source
            ));
        }
    }

    @GetMapping("/total")
    @PreAuthorize("hasRole('FINANCE')")
    @Operation(summary = "Obtenir le solde total")
    public ResponseEntity<Map<String, Object>> getTotalBalance() {
        Map<String, Object> response = Map.of(
            "success", true,
            "totalBalance", cashBalanceService.getTotalBalance()
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/summary")
    @PreAuthorize("hasRole('FINANCE')")
    @Operation(summary = "Obtenir le résumé des flux de trésorerie")
    public ResponseEntity<Map<String, Object>> getCashFlowSummary() {
        Map<String, Object> summary = cashBalanceService.getCashFlowSummary();
        summary.put("success", true);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/check-balance")
    @PreAuthorize("hasRole('FINANCE')")
    @Operation(summary = "Vérifier si le solde est suffisant")
    public ResponseEntity<Map<String, Object>> checkBalance(
            @RequestParam String source,
            @RequestParam java.math.BigDecimal amount) {
        try {
            var revenueSource = com.hospital.backend.entity.Revenue.RevenueSource.valueOf(source.toUpperCase());
            boolean hasEnough = cashBalanceService.hasEnoughBalance(revenueSource, amount);
            BigDecimal available = cashBalanceService.getBalanceBySource(revenueSource);
            
            Map<String, Object> response = Map.of(
                "success", true,
                "source", source,
                "amount", amount,
                "available", available,
                "hasEnoughBalance", hasEnough
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Source invalide: " + source
            ));
        }
    }
}
