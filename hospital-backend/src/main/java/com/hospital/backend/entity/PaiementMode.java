package com.hospital.backend.entity;

/**
 * Mode de paiement pour les dépenses
 * IMMEDIAT: Décaissement cash immédiat, solde caisse impacté
 * CREDIT: Dette fournisseur, solde caisse non impacté immédiatement
 */
public enum PaiementMode {
    IMMEDIAT,  // Paiement comptant, décaissement immédiat
    CREDIT     // Dette fournisseur, paiement différé
}
