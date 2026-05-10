package com.hospital.backend.controller;

import com.hospital.backend.dto.LivreCaisseDTO;
import com.hospital.backend.service.LivreCaisseService;
import com.hospital.backend.service.LivreCaisseExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Controller pour le Livre de Caisse
 * Gestion des entrées/sorties avec soldes cumulatifs
 */
@RestController
@RequestMapping({"/api/finance/livre-caisse", "/api/v1/finance/livre-caisse"})
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Livre de Caisse", description = "Gestion du livre de caisse - Entrées/Sorties avec solde cumulatif")
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class LivreCaisseController {

    private final LivreCaisseService livreCaisseService;
    private final LivreCaisseExportService exportService;

    /**
     * Vue Synthétique - Totaux journaliers
     */
    @GetMapping("/synthese")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'CASHIER', 'CAISSIER')")
    @Operation(summary = "Vue synthétique du livre de caisse",
            description = "Retourne les totaux par jour (entrées, sorties, solde) pour une période donnée")
    public ResponseEntity<LivreCaisseDTO.SyntheseResponse> getSynthese(
            @Parameter(description = "Date de début (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            
            @Parameter(description = "Date de fin (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin) {
        
        log.info("📊 Requête Synthèse Livre de Caisse du {} au {}", dateDebut, dateFin);
        
        // Validation des dates
        if (dateDebut.isAfter(dateFin)) {
            return ResponseEntity.badRequest().build();
        }
        
        // Limiter à 31 jours maximum pour les performances
        if (dateDebut.plusDays(31).isBefore(dateFin)) {
            return ResponseEntity.badRequest().body(null);
        }
        
        LivreCaisseDTO.SyntheseResponse response = livreCaisseService.getSynthese(dateDebut, dateFin);
        return ResponseEntity.ok(response);
    }

    /**
     * Vue Détaillée - Transaction par transaction
     */
    @GetMapping("/details")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'CASHIER', 'CAISSIER')")
    @Operation(summary = "Vue détaillée du livre de caisse",
            description = "Retourne toutes les transactions avec solde cumulatif, filtrable par caissier")
    public ResponseEntity<LivreCaisseDTO.DetailsResponse> getDetails(
            @Parameter(description = "Date de début (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            
            @Parameter(description = "Date de fin (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin,
            
            @Parameter(description = "Numéro de page (0-based)")
            @RequestParam(defaultValue = "0") int page,
            
            @Parameter(description = "Taille de la page")
            @RequestParam(defaultValue = "50") int size) {
        
        log.info("📋 Requête Détails Livre de Caisse du {} au {} (page: {}, size: {})",
                dateDebut, dateFin, page, size);

        // Validation
        if (dateDebut == null || dateFin == null) {
            log.error("❌ Dates manquantes: dateDebut={}, dateFin={}", dateDebut, dateFin);
            return ResponseEntity.badRequest().build();
        }
        if (dateDebut.isAfter(dateFin)) {
            return ResponseEntity.badRequest().build();
        }
        
        // Limiter la taille de page
        if (size > 100) {
            size = 100;
        }
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("date").ascending());
        LivreCaisseDTO.DetailsResponse response = livreCaisseService.getDetails(dateDebut, dateFin, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Filtre par caissier - Pour clôture de caisse individuelle
     */
    @GetMapping("/details/caissier/{caissierId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'CASHIER', 'CAISSIER')")
    @Operation(summary = "Transactions par caissier",
            description = "Retourne toutes les transactions d'un caissier spécifique pour une période (clôture de caisse)")
    public ResponseEntity<List<LivreCaisseDTO.DetailTransaction>> getDetailsByCaissier(
            @Parameter(description = "ID du caissier")
            @PathVariable Long caissierId,
            
            @Parameter(description = "Date de début (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            
            @Parameter(description = "Date de fin (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin) {
        
        log.info("👤 Requête Détails par Caissier {} du {} au {}", caissierId, dateDebut, dateFin);
        
        if (dateDebut.isAfter(dateFin)) {
            return ResponseEntity.badRequest().build();
        }
        
        List<LivreCaisseDTO.DetailTransaction> transactions = 
                livreCaisseService.getDetailsByCaissier(dateDebut, dateFin, caissierId);
        return ResponseEntity.ok(transactions);
    }

    /**
     * Export Excel - Génère un fichier Excel identique à votre modèle avec 2 onglets
     */
    @GetMapping("/export/excel")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'CASHIER', 'CAISSIER')")
    @Operation(summary = "Export Excel du livre de caisse",
            description = "Génère un fichier Excel avec les deux onglets (LIVRE DE CAISSE et DETAILS TRANSACTIONS)")
    public ResponseEntity<byte[]> exportExcel(
            @Parameter(description = "Date de début (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            
            @Parameter(description = "Date de fin (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin,
            
            @Parameter(description = "ID du caissier (optionnel)")
            @RequestParam(required = false) Long caissierId) {
        
        log.info("📄 Export Excel demandé du {} au {} (caissier: {})", dateDebut, dateFin, caissierId);
        
        try {
            byte[] excelBytes = exportService.exportExcel(dateDebut, dateFin, caissierId);
            
            String filename = "LIVRE-DE-CAISSE-" + dateDebut + "-" + dateFin + ".xlsx";
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .body(excelBytes);
        } catch (Exception e) {
            log.error("❌ Erreur export Excel: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Export PDF - Génère un fichier PDF avec les tableaux synthèse et détails
     */
    @GetMapping("/export/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'CASHIER', 'CAISSIER')")
    @Operation(summary = "Export PDF du livre de caisse",
            description = "Génère un fichier PDF avec les tableaux de synthèse et détails des transactions")
    public ResponseEntity<byte[]> exportPDF(
            @Parameter(description = "Date de début (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            
            @Parameter(description = "Date de fin (YYYY-MM-DD)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin,
            
            @Parameter(description = "ID du caissier (optionnel)")
            @RequestParam(required = false) Long caissierId) {
        
        log.info("📄 Export PDF demandé du {} au {} (caissier: {})", dateDebut, dateFin, caissierId);
        
        try {
            byte[] pdfBytes = exportService.exportPDF(dateDebut, dateFin, caissierId);
            
            String filename = "LIVRE-DE-CAISSE-" + dateDebut + "-" + dateFin + ".pdf";
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .body(pdfBytes);
        } catch (Exception e) {
            log.error("❌ Erreur export PDF: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Endpoint de test
     */
    @GetMapping("/test")
    @Operation(summary = "Test de disponibilité")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("✅ Livre de Caisse API opérationnel");
    }
}
