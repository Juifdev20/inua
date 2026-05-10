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
    ARRIVED, // ✅ IL MANQUAIT CELUI-CI (C'est la cause de l'erreur 500)
    LABORATOIRE_EN_ATTENTE,
    PHARMACIE_EN_ATTENTE
    
}