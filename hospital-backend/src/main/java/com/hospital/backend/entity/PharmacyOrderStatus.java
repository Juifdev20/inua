package com.hospital.backend.entity;

public enum PharmacyOrderStatus {
    EN_ATTENTE,              // Prescription en attente de validation pharmacie
    EN_PREPARATION,          // En cours de préparation
    PRETE,                   // Prête pour livraison/dispensation
    EN_ATTENTE_PAIEMENT,     // 💰 En attente de confirmation de paiement par la finance
    PAYEE,                   // Payée confirmée par finance, prête à être dispensée
    LIVREE,                  // Livrée/dispensée au patient
    ANNULEE,                 // Annulée
    PARTIELLEMENT_PAYEE,     // 💳 Partiellement payée
    PARTIELLEMENT_LIVREE     // Partiellement livrée
}
