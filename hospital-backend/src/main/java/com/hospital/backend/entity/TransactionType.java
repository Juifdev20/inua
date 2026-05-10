package com.hospital.backend.entity;

/**
 * Types de transactions pour le flux Pharmacie-Finance
 * Distingue les dépenses normales, les avoirs de correction et les retours fournisseur
 */
public enum TransactionType {
    DEPENSE,              // Dépense normale (achat stock)
    AVOIR,                // Contre-passation (montant négatif pour correction)
    RETOUR_FOURNISSEUR    // Avoir sur retour médicament défectueux
}
