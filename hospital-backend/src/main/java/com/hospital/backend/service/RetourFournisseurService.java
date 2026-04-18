package com.hospital.backend.service;

import com.hospital.backend.dto.RetourFournisseurDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.repository.CaisseRepository;
import com.hospital.backend.repository.FinanceTransactionRepository;
import com.hospital.backend.repository.MedicationRepository;
import com.hospital.backend.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service de gestion des retours fournisseur
 * Crée automatiquement un avoir et débite le stock
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RetourFournisseurService {

    private final FinanceTransactionRepository transactionRepository;
    private final CaisseRepository caisseRepository;
    private final StockMovementRepository stockMovementRepository;
    private final MedicationRepository medicationRepository;

    /**
     * Traite un retour de médicaments au fournisseur
     * Flux:
     * 1. Débite le stock (mouvement de sortie)
     * 2. Crée un avoir (montant négatif)
     * 3. Impacte la trésorerie selon le mode de l'originale
     */
    @Transactional
    public FinanceTransaction traiterRetour(RetourFournisseurDTO retour, User createdBy) {
        log.info("Traitement retour fournisseur - Commande: {}, Médicament: {}, Qté: {}",
            retour.getCommandeOriginaleId(), retour.getMedicamentId(), retour.getQuantite());

        // 1. Débiter le stock (créer mouvement de sortie)
        creerMouvementSortieStock(retour, createdBy);

        // 2. Créer l'avoir
        FinanceTransaction avoir = FinanceTransaction.builder()
            .type(TransactionType.RETOUR_FOURNISSEUR)
            .status(TransactionStatus.PAYE) // Avoir immédiat
            .paiementMode(PaiementMode.IMMEDIAT)
            .montant(retour.getMontantRemboursement().negate()) // Négatif
            .devise(retour.getDevise())
            .categorie("Avoir Fournisseur - Retour médicaments")
            .referenceFournisseur(retour.getNumeroBonRetour())
            .commandePharmacieId(retour.getCommandeOriginaleId())
            .fournisseurId(retour.getFournisseurId())
            .motifCorrection("Retour fournisseur: " + retour.getMotif())
            .createdBy(createdBy)
            .immutable(true)
            .build();

        // 3. Impacter selon le mode de la transaction originale
        Optional<FinanceTransaction> txOriginaleOpt = transactionRepository
            .findByCommandePharmacieIdAndType(retour.getCommandeOriginaleId(), TransactionType.DEPENSE);

        txOriginaleOpt.ifPresent(txOriginale -> {
            avoir.setTransactionOriginaleId(txOriginale.getId());
            
            if (txOriginale.getStatus() == TransactionStatus.A_PAYER) {
                // Réduire la dette (la dette diminue)
                log.info("Réduction dette fournisseur: {} {}",
                    retour.getMontantRemboursement(), retour.getDevise());
                // La dette est virtuelle, pas d'impact caisse
                
            } else if (txOriginale.getStatus() == TransactionStatus.PAYE && txOriginale.getCaisse() != null) {
                // Créditer la caisse (remboursement)
                Caisse caisse = txOriginale.getCaisse();
                caisse.crediter(retour.getMontantRemboursement());
                caisseRepository.save(caisse);
                
                avoir.setCaisse(caisse);
                avoir.setDateDecaissement(LocalDateTime.now());
                
                log.info("Remboursement caisse {}: +{} {}",
                    caisse.getNom(), retour.getMontantRemboursement(), retour.getDevise());
            }
        });

        FinanceTransaction saved = transactionRepository.save(avoir);
        log.info("Avoir retour fournisseur créé ID: {}", saved.getId());

        return saved;
    }

    /**
     * Crée un mouvement de sortie de stock pour le retour
     */
    private void creerMouvementSortieStock(RetourFournisseurDTO retour, User createdBy) {
        Medication medicament = medicationRepository.findById(retour.getMedicamentId())
            .orElseThrow(() -> new IllegalArgumentException("Médicament non trouvé"));

        int previousStock = medicament.getStockQuantity() != null ? medicament.getStockQuantity() : 0;
        int newStock = previousStock - retour.getQuantite();

        if (newStock < 0) {
            throw new IllegalStateException("Stock insuffisant pour le retour");
        }

        // Mettre à jour le stock
        medicament.setStockQuantity(newStock);
        medicationRepository.save(medicament);

        // Créer le mouvement
        StockMovement movement = StockMovement.builder()
            .medication(medicament)
            .quantityChange(-retour.getQuantite())
            .previousStock(previousStock)
            .newStock(newStock)
            .movementType(StockMovement.MovementType.SORTIE_RETOUR_FOURNISSEUR)
            .referenceId(retour.getCommandeOriginaleId())
            .referenceType("RETOUR_FOURNISSEUR")
            .notes("Retour fournisseur: " + retour.getMotif())
            .createdBy(createdBy)
            .build();

        stockMovementRepository.save(movement);
        
        log.info("Stock débité: {} -> {} (retour {} unités)",
            previousStock, newStock, retour.getQuantite());
    }
}
