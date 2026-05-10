package com.hospital.backend.entity;

/**
 * Statuts du workflow transactionnel Pharmacie-Finance
 * EN_ATTENTE_SCAN: Créée automatiquement, scan facture manquant
 * A_PAYER: Crédit validé, attente paiement (dette fournisseur)
 * PAYE: Décaissement effectif (cash)
 * CONTRE_PASSEE: Annulée par contre-passation (avoir)
 */
public enum TransactionStatus {
    EN_ATTENTE_SCAN,    // Créée, scan obligatoire avant validation
    A_PAYER,            // Crédit validé, dette enregistrée
    PAYE,               // Décaissement effectué
    CONTRE_PASSEE       // Annulée par avoir (immutable)
}
