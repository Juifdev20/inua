package com.hospital.backend.service;

import com.hospital.backend.dto.ValidationDepenseDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.repository.CaisseRepository;
import com.hospital.backend.repository.ExpenseRepository;
import com.hospital.backend.repository.FinanceTransactionRepository;
import com.hospital.backend.repository.MedicationRepository;
import com.hospital.backend.repository.StockMovementRepository;
import com.hospital.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Service de validation des dépenses par le caissier
 * Gère le workflow de validation avec scan obligatoire
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DepenseValidationService {

    private final FinanceTransactionRepository transactionRepository;
    private final CaisseRepository caisseRepository;
    private final CaisseService caisseService;
    private final FileStorageService fileStorageService;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final ExpenseCreationService expenseCreationService;
    private final StockMovementRepository stockMovementRepository;
    private final MedicationRepository medicationRepository;

    /**
     * Valide une dépense avec scan de facture obligatoire
     * Deux modes: IMMEDIAT (décaissement) ou CREDIT (dette)
     */
    @Transactional
    public FinanceTransaction validerDepense(Long transactionId, 
                                              MultipartFile scanFacture,
                                              ValidationDepenseDTO validationDTO,
                                              User validatedBy) {
        
        log.info("Validation dépense ID: {} par {}", transactionId, validatedBy.getUsername());

        FinanceTransaction transaction = transactionRepository.findById(transactionId)
            .orElseThrow(() -> new IllegalArgumentException("Transaction non trouvée: " + transactionId));

        // Vérifications
        if (!transaction.canBeModified()) {
            throw new IllegalStateException("Cette transaction ne peut plus être modifiée (immutable)");
        }

        if (transaction.getStatus() != TransactionStatus.EN_ATTENTE_SCAN) {
            throw new IllegalStateException("Transaction non en attente de scan");
        }

        // 🔧 Scan obligatoire seulement si pas de pièce justificative existante
        boolean hasJustificatif = transaction.getJustificatifUrl() != null && !transaction.getJustificatifUrl().isEmpty();
        
        if ((scanFacture == null || scanFacture.isEmpty()) && !hasJustificatif) {
            throw new IllegalArgumentException("Le scan de la facture fournisseur est obligatoire car aucune pièce justificative n'est fournie");
        }

        // Upload du scan si fourni
        if (scanFacture != null && !scanFacture.isEmpty()) {
            String scanUrl = fileStorageService.store(scanFacture, "factures-fournisseurs");
            transaction.setScanFactureUrl(scanUrl);
        } else if (hasJustificatif) {
            // Utiliser la pièce justificative comme scan
            transaction.setScanFactureUrl(transaction.getJustificatifUrl());
            log.info("ℹ️ Utilisation de la pièce justificative existante comme scan: {}", transaction.getJustificatifUrl());
        }

        // Appliquer le mode de paiement
        PaiementMode mode = validationDTO.getModePaiement() != null 
            ? validationDTO.getModePaiement() 
            : transaction.getPaiementMode();
        
        if (mode == null) {
            mode = PaiementMode.CREDIT; // Sécurité: défaut au crédit
        }
        
        transaction.setPaiementMode(mode);

        if (mode == PaiementMode.IMMEDIAT) {
            // PAIEMENT IMMÉDIAT: décaissement cash
            if (validationDTO.getCaisseId() == null) {
                throw new IllegalArgumentException("ID caisse requis pour paiement immédiat");
            }

            // Utiliser CaisseService pour gérer aussi les caisses virtuelles
            Caisse caisse = caisseService.getCaisse(validationDTO.getCaisseId());

            // Vérifier devise compatible
            if (caisse.getDevise() != transaction.getDevise()) {
                throw new IllegalArgumentException(
                    "Devise caisse (" + caisse.getDevise() + ") incompatible avec transaction (" + transaction.getDevise() + ")");
            }

            // Décaissement via CaisseService (gère les caisses virtuelles aussi)
            caisseService.debiterCaisse(validationDTO.getCaisseId(), transaction.getMontant());

            // Ne pas persister la caisse virtuelle (ID < 0), juste logger
            if (caisse.getId() > 0) {
                transaction.setCaisse(caisse);
            } else {
                log.info("Caisse virtuelle {} utilisée (non persistée)", caisse.getNom());
            }
            transaction.setStatus(TransactionStatus.PAYE);
            transaction.setDateDecaissement(LocalDateTime.now());
            transaction.setDateValidation(LocalDateTime.now()); // Date de validation = date de décaissement
            transaction.setValidatedBy(validatedBy);

            // Créer l'Expense pour le livre de caisse et les calculs globaux (transaction séparée)
            log.info("📤 Appel ExpenseCreationService pour transaction {} avec date décaissement: {}", 
                transaction.getId(), transaction.getDateDecaissement());
            expenseCreationService.creerExpenseFromTransaction(transaction, validatedBy);

            log.info("Décaissement immédiat effectué: {} {} sur caisse {}",
                transaction.getMontant(), transaction.getDevise(), caisse.getNom());

        } else {
            // CRÉDIT: enregistrer la dette, pas de décaissement
            transaction.setStatus(TransactionStatus.A_PAYER);
            
            // Date d'échéance si fournie
            if (validationDTO.getDateEcheancePaiement() != null) {
                transaction.setDateEcheancePaiement(validationDTO.getDateEcheancePaiement());
            } else {
                // Défaut: 30 jours
                transaction.setDateEcheancePaiement(LocalDate.now().plusDays(30));
            }

            log.info("Dette fournisseur enregistrée: {} {} à payer avant {}",
                transaction.getMontant(), transaction.getDevise(), transaction.getDateEcheancePaiement());
        }

        // Marquer immutable
        transaction.setImmutable(true);
        // dateValidation et validatedBy déjà settés plus haut pour paiement immédiat
        if (transaction.getValidatedBy() == null) {
            transaction.setValidatedBy(validatedBy);
        }
        if (transaction.getDateValidation() == null) {
            transaction.setDateValidation(LocalDateTime.now());
        }

        // 🔧 MISE À JOUR DU STOCK PHARMACIE SI ACHAT MÉDICAMENT
        // Rechercher si un mouvement de stock est lié à cette transaction
        List<StockMovement> pendingMovements = stockMovementRepository.findByFinanceTransactionId(transactionId);
        StockMovement pendingMovement = pendingMovements.stream()
            .filter(m -> m.getStatus() == StockMovement.MovementStatus.EN_ATTENTE_VALIDATION)
            .findFirst()
            .orElse(null);
        
        if (pendingMovement != null) {
            log.info("📦 Mouvement de stock en attente trouvé ID: {} - Validation du stock", pendingMovement.getId());
            
            Medication medication = pendingMovement.getMedication();
            int previousStock = medication.getStockQuantity() != null ? medication.getStockQuantity() : 0;
            int quantityToAdd = pendingMovement.getQuantityChange(); // Positif pour entrée
            int newStock = previousStock + quantityToAdd;
            
            // Mettre à jour le stock du médicament
            medication.setStockQuantity(newStock);
            medicationRepository.save(medication);
            log.info("📦 Stock mis à jour: {} → {} (quantité ajoutée: {})", previousStock, newStock, quantityToAdd);
            
            // Mettre à jour le mouvement de stock
            pendingMovement.setStatus(StockMovement.MovementStatus.VALIDE);
            pendingMovement.setPreviousStock(previousStock);
            pendingMovement.setNewStock(newStock);
            stockMovementRepository.save(pendingMovement);
            log.info("✅ Mouvement de stock validé ID: {}", pendingMovement.getId());
        }

        return transactionRepository.save(transaction);
    }

    /**
     * Paiement différé d'une dette (transition A_PAYER -> PAYE)
     */
    @Transactional
    public FinanceTransaction payerDette(Long transactionId, Long caisseId, User payeur) {
        FinanceTransaction transaction = transactionRepository.findById(transactionId)
            .orElseThrow(() -> new IllegalArgumentException("Transaction non trouvée"));

        if (transaction.getStatus() != TransactionStatus.A_PAYER) {
            throw new IllegalStateException("Cette transaction n'est pas en attente de paiement");
        }

        if (transaction.getPaiementMode() != PaiementMode.CREDIT) {
            throw new IllegalStateException("Cette transaction n'est pas en mode crédit");
        }

        // Utiliser CaisseService pour gérer aussi les caisses virtuelles
        Caisse caisse = caisseService.getCaisse(caisseId);

        // Décaissement via CaisseService (gère les caisses virtuelles aussi)
        caisseService.debiterCaisse(caisseId, transaction.getMontant());

        // Mettre à jour transaction
        // Ne pas persister la caisse virtuelle (ID < 0)
        if (caisse.getId() > 0) {
            transaction.setCaisse(caisse);
        } else {
            log.info("Caisse virtuelle {} utilisée pour paiement (non persistée)", caisse.getNom());
        }
        transaction.setStatus(TransactionStatus.PAYE);
        transaction.setDateDecaissement(LocalDateTime.now());
        transaction.setDateValidation(LocalDateTime.now()); // Date de validation = date de paiement
        transaction.setValidatedBy(payeur);

        // Créer l'Expense pour le livre de caisse (paiement de dette)
        log.info("📤 Appel ExpenseCreationService pour paiement dette {} avec date décaissement: {}", 
            transaction.getId(), transaction.getDateDecaissement());
        expenseCreationService.creerExpenseFromTransaction(transaction, payeur);

        log.info("Paiement différé effectué: {} {} pour transaction {}",
            transaction.getMontant(), transaction.getDevise(), transactionId);

        return transactionRepository.save(transaction);
    }
}
