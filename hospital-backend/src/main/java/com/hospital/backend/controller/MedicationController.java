package com.hospital.backend.controller;

import com.hospital.backend.dto.MedicationDTO;
import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.dto.ReceptionCommandeDTO;
import com.hospital.backend.dto.UserDTO;
import com.hospital.backend.entity.Currency;
import com.hospital.backend.entity.FinanceTransaction;
import com.hospital.backend.entity.PaiementMode;
import com.hospital.backend.entity.User;
import com.hospital.backend.service.MedicationService;
import com.hospital.backend.service.PharmacieFinanceIntegrationService;
import com.hospital.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/medications")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Medications", description = "Gestion des médicaments et inventaire pharmacie")
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class MedicationController {

    private final MedicationService medicationService;
    private final PharmacieFinanceIntegrationService pharmacieFinanceIntegrationService;
    private final UserService userService;

    @PostMapping("/inventory/add")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN')")
    @Operation(summary = "Ajouter un médicament en stock", description = "Ajoute un nouveau médicament à l'inventaire et crée automatiquement une transaction finance")
    public ResponseEntity<ApiResponse<MedicationDTO>> addMedicationToInventory(@Valid @RequestBody MedicationDTO medicationDTO) {
        try {
            log.info("Ajout d'un médicament à l'inventaire: {}", medicationDTO.getName());
            
            MedicationDTO savedMedication = medicationService.saveMedication(medicationDTO);
            
            // ═══════════════════════════════════════════════════════════════════
            // 🔗 FLUX PHARMACIE-FINANCE: Créer transaction automatiquement
            // ═══════════════════════════════════════════════════════════════════
            FinanceTransaction transactionFinance = null;
            if (medicationDTO.getStockQuantity() > 0 && medicationDTO.getSupplier() != null) {
                try {
                    // Déterminer le prix d'achat unitaire (price = prix d'achat, unitPrice = prix de vente)
                    BigDecimal prixAchatUnitaire = medicationDTO.getPrice() != null 
                        ? medicationDTO.getPrice() 
                        : BigDecimal.ZERO;
                    
                    // Calculer le montant total = prix unitaire × quantité
                    BigDecimal totalAmount = prixAchatUnitaire.multiply(new BigDecimal(medicationDTO.getStockQuantity()));
                    
                    // Déterminer la devise d'achat (purchaseCurrency prioritaire)
                    Currency deviseAchat = medicationDTO.getPurchaseCurrency() != null 
                        ? medicationDTO.getPurchaseCurrency() 
                        : (medicationDTO.getDevise() != null ? medicationDTO.getDevise() : Currency.CDF);
                    
                    // Déterminer le taux de change (par défaut 1.0 si pas de conversion)
                    BigDecimal tauxChange = medicationDTO.getTauxChange() != null 
                        ? medicationDTO.getTauxChange() 
                        : BigDecimal.ONE;
                    
                    log.info("🔍 [MEDICATION-FINANCE] Calcul achat: {} {} × {} = {} {} (taux: {})", 
                        prixAchatUnitaire, deviseAchat, medicationDTO.getStockQuantity(), totalAmount, deviseAchat, tauxChange);
                    
                    // Créer le DTO de réception
                    ReceptionCommandeDTO receptionDTO = ReceptionCommandeDTO.builder()
                        .commandeId(null) // Achat direct sans commande
                        .numeroFactureFournisseur("ACHAT-" + System.currentTimeMillis())
                        .dateFactureFournisseur(medicationDTO.getPurchaseDate() != null ? medicationDTO.getPurchaseDate() : LocalDate.now())
                        .total(totalAmount)
                        .devise(deviseAchat)
                        .paiementMode(PaiementMode.CREDIT) // Sécurité: crédit par défaut
                        .fournisseurId(null) // Fournisseur saisi en texte libre
                        .fournisseurNom(medicationDTO.getSupplier())
                        .numeroLivraison("CREATION-" + savedMedication.getId())
                        .tauxChange(tauxChange)
                        .build();
                    
                    // Récupérer l'utilisateur courant
                    User currentUser = getCurrentUser();
                    
                    // Créer la transaction finance
                    transactionFinance = pharmacieFinanceIntegrationService.onReceptionCommandeValidee(receptionDTO, currentUser);
                    
                    log.info("✅ [MEDICATION-FINANCE] Transaction créée ID: {} pour médicament {}",
                        transactionFinance.getId(), savedMedication.getId());
                        
                } catch (Exception e) {
                    // Log l'erreur mais ne pas bloquer la création du médicament
                    log.error("❌ [MEDICATION-FINANCE] Erreur création transaction: {}", e.getMessage());
                }
            }
            
            String message = "Médicament ajouté à l'inventaire avec succès" + 
                (transactionFinance != null ? " (Transaction finance ID: " + transactionFinance.getId() + ")" : "");
            
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(message, savedMedication));
                    
        } catch (Exception e) {
            log.error("Erreur lors de l'ajout du médicament à l'inventaire: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur lors de l'ajout du médicament: " + e.getMessage()));
        }
    }
    
    /**
     * Récupère l'utilisateur courant à partir du contexte de sécurité
     */
    private User getCurrentUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String username = authentication.getName();
                UserDTO userDTO = userService.getByUsername(username);
                // Conversion UserDTO -> User (simplifiée)
                if (userDTO != null) {
                    User user = new User();
                    user.setId(userDTO.getId());
                    user.setUsername(userDTO.getUsername());
                    user.setFirstName(userDTO.getFirstName());
                    user.setLastName(userDTO.getLastName());
                    return user;
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ Impossible de récupérer l'utilisateur courant: {}", e.getMessage());
        }
        return null;
    }

    @GetMapping("/inventory")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN', 'ROLE_DOCTEUR')")
    @Operation(summary = "Liste des médicaments en stock", description = "Récupère tous les médicaments en stock")
    public ResponseEntity<ApiResponse<java.util.List<MedicationDTO>>> getInventory() {
        try {
            java.util.List<MedicationDTO> medications = medicationService.getAllMedications();
            
            // 🔍 DEBUG LOG - Vérification des prix
            log.info("📊 DEBUG: Nombre de médicaments récupérés: {}", medications.size());
            for (int i = 0; i < medications.size(); i++) {
                MedicationDTO med = medications.get(i);
                log.info("📊 DEBUG [{}]: {} | price: {} (type: {}) | unitPrice: {} (type: {}) | stock: {}", 
                    i, 
                    med.getName(), 
                    med.getPrice(), 
                    med.getPrice() != null ? med.getPrice().getClass().getSimpleName() : "null",
                    med.getUnitPrice(), 
                    med.getUnitPrice() != null ? med.getUnitPrice().getClass().getSimpleName() : "null",
                    med.getStockQuantity()
                );
            }
            
            return ResponseEntity.ok(ApiResponse.success("Inventaire récupéré avec succès", medications));
        } catch (Exception e) {
            log.error("Erreur lors de la récupération de l'inventaire: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur lors de la récupération de l'inventaire: " + e.getMessage()));
        }
    }

    @PutMapping("/inventory/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN')")
    @Operation(summary = "Mettre à jour un médicament", description = "Met à jour les informations d'un médicament en stock. Si isStockPurchase=true et quantityAdded>0, crée une transaction finance.")
    public ResponseEntity<ApiResponse<MedicationDTO>> updateMedication(
            @PathVariable Long id, 
            @Valid @RequestBody MedicationDTO medicationDTO) {
        try {
            log.info("Mise à jour du médicament ID: {}", id);
            
            MedicationDTO updatedMedication = medicationService.updateMedication(id, medicationDTO);
            
            // ═══════════════════════════════════════════════════════════════════
            // 🔗 FLUX PHARMACIE-FINANCE: Créer transaction si c'est un achat
            // ═══════════════════════════════════════════════════════════════════
            if (Boolean.TRUE.equals(medicationDTO.getIsStockPurchase()) && 
                medicationDTO.getQuantityAdded() != null && 
                medicationDTO.getQuantityAdded() > 0 &&
                medicationDTO.getSupplier() != null) {
                
                try {
                    BigDecimal prixAchatUnitaire = medicationDTO.getPrice() != null 
                        ? medicationDTO.getPrice() 
                        : BigDecimal.ZERO;
                    
                    // Calculer le montant avec la quantité ajoutée (pas le stock total)
                    BigDecimal totalAmount = prixAchatUnitaire.multiply(new BigDecimal(medicationDTO.getQuantityAdded()));
                    
                    Currency deviseAchat = medicationDTO.getPurchaseCurrency() != null 
                        ? medicationDTO.getPurchaseCurrency() 
                        : (medicationDTO.getDevise() != null ? medicationDTO.getDevise() : Currency.CDF);
                    
                    BigDecimal tauxChange = medicationDTO.getTauxChange() != null 
                        ? medicationDTO.getTauxChange() 
                        : BigDecimal.ONE;
                    
                    log.info("🔍 [STOCK-UPDATE-FINANCE] Calcul achat stock: {} {} × {} = {} {}", 
                        prixAchatUnitaire, deviseAchat, medicationDTO.getQuantityAdded(), totalAmount, deviseAchat);
                    
                    ReceptionCommandeDTO receptionDTO = ReceptionCommandeDTO.builder()
                        .commandeId(null)
                        .numeroFactureFournisseur("ACHAT-STOCK-" + System.currentTimeMillis())
                        .dateFactureFournisseur(LocalDate.now())
                        .total(totalAmount)
                        .devise(deviseAchat)
                        .paiementMode(PaiementMode.CREDIT)
                        .fournisseurNom(medicationDTO.getSupplier())
                        .numeroLivraison("STOCK-UPDATE-" + id)
                        .tauxChange(tauxChange)
                        .justificatifUrl(medicationDTO.getJustificatifUrl())
                        .build();
                    
                    User currentUser = getCurrentUser();
                    FinanceTransaction transactionFinance = pharmacieFinanceIntegrationService.onReceptionCommandeValidee(receptionDTO, currentUser);
                    // FORCER RECOMPILATION 2026-04-23 01:40
                    
                    log.info("✅ [STOCK-UPDATE-FINANCE] Transaction créée ID: {} | justificatifUrl: {} | montant: {} {}",
                        transactionFinance.getId(), 
                        transactionFinance.getJustificatifUrl() != null ? "PRÉSENT" : "ABSENT",
                        totalAmount, deviseAchat);
                        
                } catch (Exception ex) {
                    log.error("❌ [STOCK-UPDATE-FINANCE] Erreur création transaction: {}", ex.getMessage(), ex);
                    // On ne bloque pas la mise à jour de stock si la transaction échoue
                }
            }
            
            return ResponseEntity.ok(ApiResponse.success("Médicament mis à jour avec succès", updatedMedication));
                    
        } catch (Exception e) {
            log.error("Erreur lors de la mise à jour du médicament: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur lors de la mise à jour du médicament: " + e.getMessage()));
        }
    }

    @DeleteMapping("/inventory/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN')")
    @Operation(summary = "Supprimer un médicament", description = "Supprime un médicament de l'inventaire")
    public ResponseEntity<ApiResponse<Void>> deleteMedication(@PathVariable Long id) {
        try {
            log.info("Suppression du médicament ID: {}", id);
            
            medicationService.deleteMedication(id);
            
            return ResponseEntity.ok(ApiResponse.success("Médicament supprimé avec succès", null));
                    
        } catch (Exception e) {
            log.error("Erreur lors de la suppression du médicament: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Erreur lors de la suppression du médicament: " + e.getMessage()));
        }
    }
}
