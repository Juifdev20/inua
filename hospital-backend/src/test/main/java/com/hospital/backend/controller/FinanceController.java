package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/finance")
@RequiredArgsConstructor
@Tag(name = "Finance", description = "Gestion financière de l'hôpital")
public class FinanceController {

    @GetMapping("/reports")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    @Operation(summary = "Rapports financiers")
    public ApiResponse<String> getReports() {
        return ApiResponse.success("Accès autorisé aux rapports financiers");
    }

    @GetMapping("/invoices")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    @Operation(summary = "Liste des factures")
    public ApiResponse<String> getInvoices() {
        return ApiResponse.success("Liste des factures");
    }
}
