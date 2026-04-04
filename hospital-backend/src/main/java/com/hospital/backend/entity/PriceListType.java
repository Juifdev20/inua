package com.hospital.backend.entity;

/**
 * Enum des types de services dans la grille tarifaire
 */
public enum PriceListType {
    FICHE,                   // Frais de création de dossier patient
    CONSULTATION_GENERALE,   // Consultation générale
    CONSULTATION_SPECIALISTE, // Consultation spécialisée
    URGENCE,                 // Consultation d'urgence
    HOSPITALISATION_JOUR,    // Hospitalisation de jour
    HOSPITALISATION_NUIT     // Hospitalisation de nuit
}

