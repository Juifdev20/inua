package com.hospital.backend.service;

import com.hospital.backend.dto.ReceptionCommandeDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.repository.FinanceTransactionRepository;
import com.hospital.backend.repository.PharmacyOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Service d'intégration entre Pharmacie et Finance
 * Crée automatiquement une transaction lors de la réception d'une commande fournisseur
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PharmacieFinanceIntegrationService {

    private final FinanceTransactionRepository transactionRepository;
    private final PharmacyOrderRepository pharmacyOrderRepository;
    private final NotificationService notificationService;

    /**
     * Déclenché automatiquement lorsqu'un pharmacien valide une réception de commande
     * Crée une transaction EN_ATTENTE_SCAN dans la table Finance
     */
    @Transactional
    public FinanceTransaction onReceptionCommandeValidee(ReceptionCommandeDTO reception, User createdBy) {
        log.info("Création transaction finance pour commande pharmacie ID: {}", reception.getCommandeId());

        // Vérifier si transaction existe déjà (éviter doublons)
        if (transactionRepository.existsByCommandePharmacieIdAndType(
                reception.getCommandeId(), TransactionType.DEPENSE)) {
            log.warn("Transaction déjà existante pour commande {}", reception.getCommandeId());
            throw new IllegalStateException("Une transaction existe déjà pour cette commande");
        }

        // Déterminer le mode de paiement par défaut si non spécifié
        PaiementMode mode = reception.getPaiementMode() != null 
            ? reception.getPaiementMode() 
            : PaiementMode.CREDIT; // Par défaut crédit pour sécurité

        // Créer la transaction
        FinanceTransaction transaction = FinanceTransaction.builder()
            .type(TransactionType.DEPENSE)
            .status(TransactionStatus.EN_ATTENTE_SCAN)
            .paiementMode(mode)
            .montant(reception.getTotal())
            .devise(reception.getDevise())
            .categorie("Achat Médicaments / Réapprovisionnement Stock")
            .referenceFournisseur(reception.getNumeroFactureFournisseur())
            .commandePharmacieId(reception.getCommandeId())
            .dateFactureFournisseur(reception.getDateFactureFournisseur())
            .dateEcheancePaiement(reception.getDateEcheancePaiement())
            .fournisseurId(reception.getFournisseurId())
            .fournisseurNom(reception.getFournisseurNom())
            .numeroLivraison(reception.getNumeroLivraison())
            .createdBy(createdBy)
            .immutable(false)
            .build();

        FinanceTransaction saved = transactionRepository.save(transaction);
        
        log.info("Transaction finance créée ID: {} - Statut: {}", saved.getId(), saved.getStatus());

        // Notifier les caissiers
        notificationService.notifierNouvelleDepense(saved);

        return saved;
    }

    /**
     * Vérifie si une commande pharmacie a une transaction associée
     */
    public boolean hasTransaction(Long commandePharmacieId) {
        return transactionRepository.existsByCommandePharmacieIdAndType(
            commandePharmacieId, TransactionType.DEPENSE);
    }

    /**
     * Récupère la transaction associée à une commande
     */
    public FinanceTransaction getTransactionByCommande(Long commandePharmacieId) {
        return transactionRepository.findByCommandePharmacieIdAndType(
            commandePharmacieId, TransactionType.DEPENSE)
            .orElse(null);
    }
}
