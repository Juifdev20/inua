package com.hospital.backend.entity;

public enum ConsultationStatus {
    EN_ATTENTE,
    CONFIRME,
    CONFIRMED,
    EN_COURS,
    TERMINE,
    COMPLETED,
    ANNULE,
    CANCELLED,
    ARCHIVED,
    ARRIVED,

    // ===== Ancien workflow / compatibilité =====
    LABORATOIRE_EN_ATTENTE,
    PHARMACIE_EN_ATTENTE,
    ATTENTE_PAIEMENT_LABO,
    PENDING_PAYMENT,
    PAID_PENDING_LAB,
    PAID_COMPLETED,
    PAYEE,

    // ===== Nouveau workflow examens =====
    EXAMENS_PRESCRITS, // le médecin a prescrit les examens, retour à la caisse
    EXAMENS_PAYES,     // la caisse a encaissé les examens
    AU_LABO,           // les examens / le patient ont été envoyés au laboratoire
    RESULTATS_PRETS,   // tous les résultats labo sont saisis et validés
    
    // ===== Statut après traitement médical =====
    TREATED            // consultation traitée avec prescription validée
}