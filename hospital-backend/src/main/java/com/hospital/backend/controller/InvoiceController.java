package com.hospital.backend.controller;

import com.hospital.backend.dto.InvoiceDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.dto.PatientDashboardStatsDTO;
import com.hospital.backend.service.InvoiceService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    /**
     * Endpoint pour les cartes du Dashboard (Total, Payé, En attente)
     */
    @GetMapping("/patient/stats")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PatientDashboardStatsDTO> getMyStats(Authentication authentication) {
        return ResponseEntity.ok(invoiceService.getPatientDashboardStats(authentication.getName()));
    }

    /**
     * Endpoint pour le tableau des factures du patient (Pagination)
     */
    @GetMapping("/patient/my-invoices")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PageResponse<InvoiceDTO>> getMyInvoices(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(invoiceService.getInvoicesByPatientEmail(authentication.getName(), pageable));
    }

    /**
     * Génération et téléchargement du PDF de la facture
     */
    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
    public void downloadInvoicePDF(@PathVariable Long id, HttpServletResponse response) throws IOException {
        InvoiceDTO invoice = invoiceService.getById(id);

        // Configuration de la réponse HTTP pour un fichier PDF
        response.setContentType("application/pdf");
        String headerKey = "Content-Disposition";
        String headerValue = "attachment; filename=Facture_" + invoice.getInvoiceCode() + ".pdf";
        response.setHeader(headerKey, headerValue);

        // On écrit le PDF directement dans le flux de sortie de la réponse
        invoiceService.exportToPDF(invoice, response.getOutputStream());
    }

    /**
     * Détail d'une facture par ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN', 'DOCTOR')")
    public ResponseEntity<InvoiceDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getById(id));
    }
}