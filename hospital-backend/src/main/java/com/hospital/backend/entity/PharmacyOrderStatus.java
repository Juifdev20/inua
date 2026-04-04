package com.hospital.backend.entity;

public enum PharmacyOrderStatus {
    EN_ATTENTE,           // Prescription en attente de validation
    EN_PREPARATION,       // En cours de préparation
    PRETE,              // Prête pour livraison/dispensation
    PAYEE,              // Payée, prête à être dispensée
    LIVREE,             // Livrée/dispensée au patient
    ANNULEE,            // Annulée
    PARTIELLEMENT_LIVREE // Partiellement livrée
}
