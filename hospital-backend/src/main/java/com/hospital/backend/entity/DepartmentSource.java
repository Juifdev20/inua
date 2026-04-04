package com.hospital.backend.entity;

/**
 * Enum représentant la source/département qui a généré une facture
 */
public enum DepartmentSource {
    RECEPTION,   // Facture générée à la réception (fiche + consultation)
    DOCTOR,      // Facture générée par le médecin (examens labo)
    LABORATORY,  // Facture générée par le laboratoire
    PHARMACY     // Facture générée par la pharmacie (médicaments)
}

