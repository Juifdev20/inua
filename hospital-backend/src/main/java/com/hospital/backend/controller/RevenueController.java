package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.dto.RevenueDTO;
import com.hospital.backend.entity.Revenue.RevenueSource;
import com.hospital.backend.service.RevenueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/finance/revenues")
@RequiredArgsConstructor
@Tag(name = "Revenues", description = "Gestion des entrées de caisse")
@SecurityRequirement(name = "bearerAuth")
public class RevenueController {

    private final RevenueService revenueService;

    @PostMapping
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN')")
    @Operation(summary = "Créer une entrée de caisse")
    public ResponseEntity<ApiResponse<RevenueDTO>> createRevenue(
            @RequestBody RevenueDTO revenueDTO,
            Authentication authentication) {

        Long userId = getUserIdFromAuthentication(authentication);
        RevenueDTO savedRevenue = revenueService.createRevenue(revenueDTO, userId);

        return ResponseEntity.ok(ApiResponse.success("Entrée de caisse créée", savedRevenue));
    }

    @PostMapping("/from-invoice/{invoiceId}")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN')")
    @Operation(summary = "Créer une entrée depuis une facture payée")
    public ResponseEntity<ApiResponse<RevenueDTO>> createRevenueFromInvoice(
            @PathVariable Long invoiceId,
            Authentication authentication) {

        Long userId = getUserIdFromAuthentication(authentication);
        RevenueDTO savedRevenue = revenueService.createRevenueFromInvoice(invoiceId, userId);

        return ResponseEntity.ok(ApiResponse.success("Entrée créée depuis la facture", savedRevenue));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN')")
    @Operation(summary = "Modifier une entrée de caisse")
    public ResponseEntity<ApiResponse<RevenueDTO>> updateRevenue(
            @PathVariable Long id,
            @RequestBody RevenueDTO revenueDTO) {

        RevenueDTO updatedRevenue = revenueService.updateRevenue(id, revenueDTO);
        return ResponseEntity.ok(ApiResponse.success("Entrée mise à jour", updatedRevenue));
    }

    @GetMapping
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Liste des entrées de caisse")
    public ResponseEntity<ApiResponse<Page<RevenueDTO>>> getRevenues(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) RevenueSource source,
            @RequestParam(required = false) String sortBy,
            Authentication authentication) {

        Sort sort = sortBy != null ? Sort.by(sortBy).descending() : Sort.by("date").descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<RevenueDTO> revenues;
        if (source != null) {
            revenues = revenueService.getRevenuesBySource(source, pageable);
        } else {
            revenues = revenueService.getAllRevenues(pageable);
        }

        return ResponseEntity.ok(ApiResponse.success("Entrées récupérées", revenues));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Entrée par ID")
    public ResponseEntity<ApiResponse<RevenueDTO>> getRevenue(@PathVariable Long id) {
        RevenueDTO revenue = revenueService.getRevenueById(id);
        return ResponseEntity.ok(ApiResponse.success("Entrée trouvée", revenue));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN')")
    @Operation(summary = "Supprimer une entrée de caisse")
    public ResponseEntity<Map<String, Object>> deleteRevenue(@PathVariable Long id) {
        revenueService.deleteRevenue(id);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Entrée supprimée"
        ));
    }

    @GetMapping("/today-total")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Total des entrées du jour")
    public ResponseEntity<Map<String, Object>> getTodayTotal() {
        BigDecimal total = revenueService.getTodayTotal();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "total", total,
                "currency", "CDF"
        ));
    }

    @GetMapping("/monthly-total")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Total mensuel des entrées")
    public ResponseEntity<Map<String, Object>> getMonthlyTotal() {
        BigDecimal total = revenueService.getMonthlyTotal();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "total", total,
                "currency", "CDF"
        ));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Statistiques par source")
    public ResponseEntity<Map<String, Object>> getStatsBySource() {
        List<Object[]> stats = revenueService.getRevenuesStatsBySource();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "content", stats
        ));
    }

    @GetMapping("/dashboard-summary")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Résumé dashboard entrées")
    public ResponseEntity<Map<String, Object>> getDashboardSummary() {
        Map<String, Object> summary = revenueService.getDashboardSummary();
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/recent")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Entrées récentes")
    public ResponseEntity<ApiResponse<List<RevenueDTO>>> getRecentRevenues(
            @RequestParam(defaultValue = "10") int limit) {
        List<RevenueDTO> revenues = revenueService.getRecentRevenues(limit);
        return ResponseEntity.ok(ApiResponse.success("Entrées récentes", revenues));
    }

    private Long getUserIdFromAuthentication(Authentication authentication) {
        if (authentication == null) {
            throw new RuntimeException("Authentication required");
        }
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new RuntimeException("Invalid user ID in authentication");
        }
    }
}
