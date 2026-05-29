package com.hospital.backend.entity;

public enum NotificationType {
    RENDEZ_VOUS,
    DOCUMENT,
    FACTURATION,
    PAIEMENT,
    PAIEMENT_RECU,       // Nouveau paiement reçu (Finance)
    EXAMEN_A_REALISER,   // Examens à réaliser (Laboratoire)
    MEDICAMENT_A_PREPARER, // Médicaments à préparer (Pharmacie)
    CONSULTATION_TERMINEE, // Consultation terminée - patient à rappeler
    PRISE_MEDICAMENT,    // ⏰ Rappel de prise de médicament
    PRESCRIPTION_PRETE,  // 💊 Prescription prête à être retirée
    SYSTEME
}
