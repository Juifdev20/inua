package com.hospital.backend.mapper;

import com.hospital.backend.dto.FinanceTransactionDTO;
import com.hospital.backend.entity.FinanceTransaction;
import org.springframework.stereotype.Component;

/**
 * Mapper pour convertir FinanceTransaction en DTO
 */
@Component
public class FinanceTransactionMapper {

    public FinanceTransactionDTO toDTO(FinanceTransaction transaction) {
        if (transaction == null) {
            return null;
        }

        return FinanceTransactionDTO.builder()
            .id(transaction.getId())
            .type(transaction.getType())
            .status(transaction.getStatus())
            .paiementMode(transaction.getPaiementMode())
            .montant(transaction.getMontant())
            .devise(transaction.getDevise())
            .tauxChange(transaction.getTauxChange())
            .categorie(transaction.getCategorie())
            .referenceFournisseur(transaction.getReferenceFournisseur())
            .scanFactureUrl(transaction.getScanFactureUrl())
            .commandePharmacieId(transaction.getCommandePharmacieId())
            .dateFactureFournisseur(transaction.getDateFactureFournisseur())
            .dateEcheancePaiement(transaction.getDateEcheancePaiement())
            .dateDecaissement(transaction.getDateDecaissement())
            .caisseId(transaction.getCaisse() != null ? transaction.getCaisse().getId() : null)
            .caisseNom(transaction.getCaisse() != null ? transaction.getCaisse().getNom() : null)
            .validatedByName(transaction.getValidatedBy() != null ? transaction.getValidatedBy().getUsername() : null)
            .dateValidation(transaction.getDateValidation())
            .createdByName(transaction.getCreatedBy() != null ? transaction.getCreatedBy().getUsername() : null)
            .transactionOriginaleId(transaction.getTransactionOriginaleId())
            .transactionCorrectriceId(transaction.getTransactionCorrectriceId())
            .motifCorrection(transaction.getMotifCorrection())
            .immutable(transaction.getImmutable())
            .fournisseurNom(transaction.getFournisseurNom())
            .numeroLivraison(transaction.getNumeroLivraison())
            .createdAt(transaction.getCreatedAt())
            .updatedAt(transaction.getUpdatedAt())
            .build();
    }
}
