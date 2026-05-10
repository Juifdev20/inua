package com.hospital.backend.service;

import com.hospital.backend.dto.CorrectionTransactionDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.repository.CaisseRepository;
import com.hospital.backend.repository.FinanceTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Service de correction des transactions par contre-passation (avoir)
 * Jamais de suppression - uniquement des avoirs pour traçabilité
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CorrectionTransactionService {

    private final FinanceTransactionRepository transactionRepository;
    private final CaisseRepository caisseRepository;

    /**
     * Crée un avoir pour corriger une transaction erronée
     * L'avoir a un montant négatif qui annule l'effet de la transaction originale
     * 
     * Règles métier:
     * - Si originale PAYE: créditer la caisse (remboursement)
     * - Si originale A_PAYER: réduire la dette fournisseur
     * - Transaction originale marquée CONTRE_PASSEE
     * - Lien bi-directionnel entre originale et correctrice
     */
    @Transactional
    public FinanceTransaction creerAvoir(CorrectionTransactionDTO dto, User createdBy) {
        log.info("Création avoir pour transaction ID: {}", dto.getTransactionOriginaleId());

        FinanceTransaction originale = transactionRepository.findById(dto.getTransactionOriginaleId())
            .orElseThrow(() -> new IllegalArgumentException("Transaction originale non trouvée"));

        // Vérifications
        if (!Boolean.TRUE.equals(originale.getImmutable())) {
            throw new IllegalStateException("Seules les transactions validées (immutable) peuvent être corrigées");
        }

        if (originale.getStatus() == TransactionStatus.CONTRE_PASSEE) {
            throw new IllegalStateException("Cette transaction a déjà été contre-passée");
        }

        // Vérifier si un avoir existe déjà
        if (transactionRepository.findByTransactionCorrectriceId(originale.getId()).isPresent()) {
            throw new IllegalStateException("Un avoir existe déjà pour cette transaction");
        }

        // Créer l'avoir (montant négatif)
        FinanceTransaction avoir = FinanceTransaction.builder()
            .type(TransactionType.AVOIR)
            .status(TransactionStatus.PAYE) // Avoir est immédiatement effectif
            .paiementMode(originale.getPaiementMode())
            .montant(originale.getMontant().negate()) // MONTANT NÉGATIF
            .devise(originale.getDevise())
            .categorie("Avoir - Correction: " + originale.getCategorie())
            .referenceFournisseur("AVOIR-" + originale.getReferenceFournisseur())
            .commandePharmacieId(originale.getCommandePharmacieId())
            .transactionOriginaleId(originale.getId())
            .motifCorrection(dto.getMotifCorrection())
            .fournisseurId(originale.getFournisseurId())
            .fournisseurNom(originale.getFournisseurNom())
            .createdBy(createdBy)
            .immutable(true)
            .build();

        // Impact selon le statut de la transaction originale
        if (originale.getStatus() == TransactionStatus.PAYE && originale.getCaisse() != null) {
            // Originale PAYE: créditer la caisse (remboursement)
            Caisse caisse = originale.getCaisse();
            caisse.crediter(originale.getMontant());
            caisseRepository.save(caisse);
            
            avoir.setCaisse(caisse);
            avoir.setDateDecaissement(LocalDateTime.now());
            
            log.info("Remboursement caisse {}: +{} {}", 
                caisse.getNom(), originale.getMontant(), originale.getDevise());

        } else if (originale.getStatus() == TransactionStatus.A_PAYER) {
            // Originale A_PAYER: réduire la dette (logique métier à implémenter selon vos besoins)
            // Par défaut, simplement créer l'avoir qui viendra s'imputer
            log.info("Réduction dette fournisseur {}: {} {}", 
                originale.getFournisseurNom(), originale.getMontant(), originale.getDevise());
        }

        // Sauvegarder l'avoir
        FinanceTransaction avoirSaved = transactionRepository.save(avoir);

        // Marquer l'originale comme contre-passée
        originale.setStatus(TransactionStatus.CONTRE_PASSEE);
        originale.setTransactionCorrectriceId(avoirSaved.getId());
        transactionRepository.save(originale);

        log.info("Avoir créé ID: {} - Transaction {} contre-passée", 
            avoirSaved.getId(), originale.getId());

        return avoirSaved;
    }

    /**
     * Récupère l'avoir lié à une transaction (si existe)
     */
    public FinanceTransaction getAvoirForTransaction(Long transactionId) {
        return transactionRepository.findByTransactionCorrectriceId(transactionId)
            .orElse(null);
    }

    /**
     * Vérifie si une transaction a été corrigée
     */
    public boolean isTransactionCorrigee(Long transactionId) {
        return transactionRepository.findByTransactionCorrectriceId(transactionId).isPresent();
    }
}
