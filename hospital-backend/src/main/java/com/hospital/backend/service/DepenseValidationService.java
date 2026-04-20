package com.hospital.backend.service;

import com.hospital.backend.dto.ValidationDepenseDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.repository.CaisseRepository;
import com.hospital.backend.repository.ExpenseRepository;
import com.hospital.backend.repository.FinanceTransactionRepository;
import com.hospital.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;

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

        // Scan obligatoire
        if (scanFacture == null || scanFacture.isEmpty()) {
            throw new IllegalArgumentException("Le scan de la facture fournisseur est obligatoire pour la validation");
        }

        // Upload du scan
        String scanUrl = fileStorageService.store(scanFacture, "factures-fournisseurs");
        transaction.setScanFactureUrl(scanUrl);

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

            // Créer l'Expense pour le livre de caisse et les calculs globaux
            Expense expense = Expense.builder()
                .amount(transaction.getMontant())
                .category(Expense.ExpenseCategory.PHARMACIE)
                .currency(transaction.getDevise())
                .date(LocalDateTime.now())
                .description("Validation dépense: " + (transaction.getCategorie() != null ? transaction.getCategorie() : "Achat Médicaments"))
                .createdBy(validatedBy)
                .build();
            expenseRepository.save(expense);
            log.info("✅ Expense créée ID: {} pour transaction {}", expense.getId(), transactionId);

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
        transaction.setValidatedBy(validatedBy);
        transaction.setDateValidation(LocalDateTime.now());

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

        // Créer l'Expense pour le livre de caisse (paiement de dette)
        Expense expense = Expense.builder()
            .amount(transaction.getMontant())
            .category(Expense.ExpenseCategory.PHARMACIE)
            .currency(transaction.getDevise())
            .date(LocalDateTime.now())
            .description("Paiement dette: " + (transaction.getCategorie() != null ? transaction.getCategorie() : "Achat Médicaments"))
            .createdBy(payeur)
            .build();
        expenseRepository.save(expense);
        log.info("✅ Expense créée pour paiement dette ID: {}", expense.getId());

        log.info("Paiement différé effectué: {} {} pour transaction {}",
            transaction.getMontant(), transaction.getDevise(), transactionId);

        return transactionRepository.save(transaction);
    }
}
