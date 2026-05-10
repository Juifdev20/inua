package com.hospital.backend.service;

import com.hospital.backend.dto.InvoiceDTO;
import com.hospital.backend.entity.Prescription;

/**
 * Service spécialisé pour la liaison Prescription → Facture
 * Responsabilité : Créer automatiquement les factures lors de la validation des prescriptions
 */
public interface PrescriptionInvoiceService {
    
    /**
     * Génère automatiquement une facture à partir d'une prescription validée
     * @param prescription La prescription validée
     * @return La facture créée avec statut EN_ATTENTE
     */
    InvoiceDTO generateInvoiceFromPrescription(Prescription prescription);
    
    /**
     * Calcule le montant total d'une prescription
     * @param prescriptionId ID de la prescription
     * @return Montant total calculé
     */
    java.math.BigDecimal calculatePrescriptionTotal(Long prescriptionId);
}
