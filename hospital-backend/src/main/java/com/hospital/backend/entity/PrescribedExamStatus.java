package com.hospital.backend.entity;

public enum PrescribedExamStatus {
    PENDING,             // En attente de traitement initial
    PRESCRIBED,          // Prescrit par le médecin
    ADJUSTED_BY_CASHIER, // Modifié/validé par la caisse avant paiement
    PAID,                // Payé à la caisse
    PAID_PENDING_LAB,    // Payé, en attente du laboratoire
    IN_PROGRESS,         // En cours au laboratoire
    COMPLETED,           // Terminé au laboratoire
    RESULTS_AVAILABLE,   // Résultats disponibles - prêts pour le médecin
    DELIVERED_TO_DOCTOR, // Résultats remis au médecin
    ARCHIVED,            // Dossier archivé
    CANCELLED            // Annulé / retiré
}