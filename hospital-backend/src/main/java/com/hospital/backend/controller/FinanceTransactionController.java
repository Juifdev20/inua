package com.hospital.backend.controller;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.*;
import com.hospital.backend.repository.CaisseRepository;
import com.hospital.backend.repository.FinanceTransactionRepository;
import com.hospital.backend.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Controller pour la gestion des transactions Finance liées à la Pharmacie
 * Gère le workflow: EN_ATTENTE_SCAN -> A_PAYER/PAYE
 */
@RestController
@RequestMapping({"/api/finance/transactions", "/api/v1/finance/transactions"})
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Finance-Pharmacie", description = "Gestion du flux Pharmacie-Finance (dépenses, avoirs, retours)")
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class FinanceTransactionController {

    private final PharmacieFinanceIntegrationService integrationService;
    private final DepenseValidationService validationService;
    private final CorrectionTransactionService correctionService;
    private final RetourFournisseurService retourService;
    private final FinanceTransactionRepository transactionRepository;
    private final CaisseRepository caisseRepository;
    private final CaisseService caisseService;

    // ========================================
    // 📋 LISTES ET CONSULTATION
    // ========================================

    @GetMapping("/en-attente")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'CAISSIER')")
    @Operation(summary = "Liste des dépenses en attente de validation",
            description = "Transactions créées par la pharmacie, en attente de scan et validation")
    public ResponseEntity<?> getDepensesEnAttente() {
        try {
            List<FinanceTransaction> transactions = transactionRepository
                .findByTypeOrderByCreatedAtDesc(TransactionType.DEPENSE);
            log.info("✅ {} dépense(s) chargée(s)", transactions.size());
            return ResponseEntity.ok(transactions);
        } catch (Exception e) {
            log.error("❌ Erreur chargement dépenses: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Erreur chargement dépenses: " + e.getMessage()));
        }
    }

    @GetMapping("/dettes-fournisseurs")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'CAISSIER')")
    @Operation(summary = "Liste des dettes fournisseurs (crédits)",
            description = "Transactions A_PAYER triées par date d'échéance")
    public ResponseEntity<List<FinanceTransaction>> getDettesFournisseurs() {
        return ResponseEntity.ok(
            transactionRepository.findDettesFournisseurs(TransactionStatus.A_PAYER, TransactionType.DEPENSE)
        );
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'CAISSIER')")
    @Operation(summary = "Liste paginée des transactions")
    public ResponseEntity<Page<FinanceTransaction>> getAllTransactions(Pageable pageable) {
        return ResponseEntity.ok(transactionRepository.findAll(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'CAISSIER')")
    @Operation(summary = "Détail d'une transaction")
    public ResponseEntity<FinanceTransaction> getTransaction(@PathVariable Long id) {
        return transactionRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // ========================================
    // ✅ VALIDATION CAISSIER (avec scan obligatoire)
    // ========================================

    @PostMapping(value = "/{id}/valider", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('CAISSIER', 'FINANCE', 'ADMIN')")
    @Operation(summary = "Valider une dépense avec scan de facture",
            description = "Upload du scan obligatoire. Mode: IMMEDIAT (décaissement) ou CREDIT (dette)")
    public ResponseEntity<?> validerDepense(
            @PathVariable Long id,
            @Parameter(description = "Scan de la facture fournisseur (PDF/JPG/PNG)", required = true)
            @RequestParam("scanFacture") MultipartFile scanFacture,
            @Parameter(description = "Mode paiement: IMMEDIAT ou CREDIT")
            @RequestParam("modePaiement") PaiementMode modePaiement,
            @Parameter(description = "ID caisse (requis si IMMEDIAT)")
            @RequestParam(value = "caisseId", required = false) Long caisseId,
            @Parameter(description = "Date échéance paiement (si CREDIT)")
            @RequestParam(value = "dateEcheance", required = false) String dateEcheance,
            @AuthenticationPrincipal User currentUser) {
        try {
            // Vérifier que l'utilisateur est authentifié
            if (currentUser == null) {
                log.error("❌ Utilisateur non authentifié lors de la validation dépense ID: {}", id);
                return ResponseEntity.status(401).body(ApiResponse.error("Utilisateur non authentifié"));
            }
            
            log.info("📤 Validation dépense ID: {}, mode: {}, fichier: {}, user: {}", id, modePaiement, 
                    scanFacture != null ? scanFacture.getOriginalFilename() : "null",
                    currentUser.getUsername());

            ValidationDepenseDTO dto = ValidationDepenseDTO.builder()
                .transactionId(id)
                .modePaiement(modePaiement)
                .caisseId(caisseId)
                .build();

            FinanceTransaction validated = validationService.validerDepense(id, scanFacture, dto, currentUser);
            
            // Retourner une réponse simplifiée pour éviter les problèmes de sérialisation
            return ResponseEntity.ok(ApiResponse.success("Dépense validée avec succès", 
                Map.of("id", validated.getId(), 
                       "status", validated.getStatus(),
                       "montant", validated.getMontant(),
                       "devise", validated.getDevise())));
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("❌ Erreur validation dépense: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur interne validation dépense: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Erreur validation: " + e.getMessage()));
        }
    }

    // ========================================
    // 💰 PAIEMENT DIFFÉRÉ (Dette -> Payé)
    // ========================================

    @PostMapping("/{id}/payer")
    @PreAuthorize("hasAnyRole('CAISSIER', 'FINANCE', 'ADMIN')")
    @Operation(summary = "Payer une dette fournisseur",
            description = "Transition A_PAYER -> PAYE avec décaissement de la caisse")
    public ResponseEntity<?> payerDette(
            @PathVariable Long id,
            @RequestParam("caisseId") Long caisseId,
            @AuthenticationPrincipal User currentUser) {
        try {
            // Vérifier que l'utilisateur est authentifié
            if (currentUser == null) {
                log.error("❌ Utilisateur non authentifié lors du paiement dette ID: {}", id);
                return ResponseEntity.status(401).body(ApiResponse.error("Utilisateur non authentifié"));
            }
            
            FinanceTransaction payee = validationService.payerDette(id, caisseId, currentUser);
            return ResponseEntity.ok(ApiResponse.success("Dette payée avec succès", 
                Map.of("id", payee.getId(), 
                       "status", payee.getStatus(),
                       "montant", payee.getMontant(),
                       "devise", payee.getDevise())));
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("❌ Erreur paiement dette: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erreur interne paiement dette: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Erreur paiement: " + e.getMessage()));
        }
    }

    // ========================================
    // 🔄 CORRECTION (Avoir/Contre-passation)
    // ========================================

    @PostMapping("/{id}/corriger")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'CAISSIER')")
    @Operation(summary = "Créer un avoir pour corriger une transaction",
            description = "La transaction originale sera marquée CONTRE_PASSEE. Jamais de suppression!")
    public ResponseEntity<FinanceTransaction> corrigerTransaction(
            @PathVariable Long id,
            @RequestBody CorrectionTransactionDTO dto,
            @AuthenticationPrincipal User currentUser) {

        dto.setTransactionOriginaleId(id);
        FinanceTransaction avoir = correctionService.creerAvoir(dto, currentUser);
        return ResponseEntity.ok(avoir);
    }

    @GetMapping("/{id}/avoir")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'CAISSIER')")
    @Operation(summary = "Récupérer l'avoir lié à une transaction (si corrigée)")
    public ResponseEntity<FinanceTransaction> getAvoir(@PathVariable Long id) {
        return ResponseEntity.ok(correctionService.getAvoirForTransaction(id));
    }

    // ========================================
    // 📦 RETOUR FOURNISSEUR (Flux inverse)
    // ========================================

    @PostMapping("/retour-fournisseur")
    @PreAuthorize("hasRole('PHARMACIEN')")
    @Operation(summary = "Traiter un retour de médicaments au fournisseur",
            description = "Débite le stock et crée automatiquement un avoir")
    public ResponseEntity<FinanceTransaction> traiterRetour(
            @RequestBody RetourFournisseurDTO dto,
            @AuthenticationPrincipal User currentUser) {

        FinanceTransaction avoir = retourService.traiterRetour(dto, currentUser);
        return ResponseEntity.ok(avoir);
    }

    // ========================================
    // 📊 CAISSES
    // ========================================

    @GetMapping("/caisses")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'CAISSIER')")
    @Operation(summary = "Liste des caisses actives (incluant caisse centrale virtuelle)")
    public ResponseEntity<List<Caisse>> getCaisses() {
        List<Caisse> caisses = caisseService.getCaissesActives();
        log.info("✅ {} caisse(s) chargée(s) (incluant caisses centrales virtuelles)", caisses.size());
        return ResponseEntity.ok(caisses);
    }

    // ========================================
    // 📊 STATISTIQUES JOURNALIÈRES
    // ========================================

    @GetMapping("/today-total")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'CAISSIER')")
    @Operation(summary = "Total des dépenses du jour (achats médicaments inclus)",
            description = "Inclut toutes les transactions DEPENSE créées aujourd'hui (achats pharmacie + dépenses traditionnelles)")
    public ResponseEntity<java.util.Map<String, Object>> getTodayTotal() {
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalDateTime startOfDay = today.atStartOfDay();
        java.time.LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

        java.util.List<FinanceTransaction> todayTransactions = transactionRepository
            .findByTypeAndCreatedAtBetween(TransactionType.DEPENSE, startOfDay, endOfDay);

        java.math.BigDecimal total = todayTransactions.stream()
            .map(FinanceTransaction::getMontant)
            .filter(m -> m != null)
            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        return ResponseEntity.ok(java.util.Map.of(
            "success", true,
            "total", total,
            "count", todayTransactions.size(),
            "currency", "CDF",
            "source", "FinanceTransaction (inclut achats médicaments)"
        ));
    }
}
