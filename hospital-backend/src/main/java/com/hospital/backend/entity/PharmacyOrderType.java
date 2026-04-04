package com.hospital.backend.entity;

public enum PharmacyOrderType {
    VENTE_INTERNE,       // Vente interne (patient hospitalisé)
    ORDONNANCE_EXTERNE,  // Ordonnance externe
    VENTE_DIRECTE,       // Vente directe sans ordonnance
    APPROVISIONNEMENT    // Approvisionnement du stock
}
