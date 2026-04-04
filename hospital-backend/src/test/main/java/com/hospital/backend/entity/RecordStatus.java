package com.hospital.backend.entity;

/**
 * Définit l'état d'avancement d'un dossier médical ou d'un acte clinique.
 */
public enum RecordStatus {
    EN_COURS,   // Le médecin est en train de remplir le dossier
    TERMINE,    // Le diagnostic et le traitement sont validés
    ANNULE,     // L'acte médical a été annulé
    ARCHIVE,
    ARRIVED,// Dossier ancien conservé pour l'historique
    URGENT      // Nécessite une attention immédiate

}