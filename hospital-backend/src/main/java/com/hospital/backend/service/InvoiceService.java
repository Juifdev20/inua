package com.hospital.backend.service;

import com.hospital.backend.dto.InvoiceDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.dto.PatientDashboardStatsDTO;
import com.hospital.backend.entity.DepartmentSource;
import com.hospital.backend.entity.InvoiceStatus;
import com.hospital.backend.entity.PaymentMethod;
import org.springframework.data.domain.Pageable;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface InvoiceService {
    // --- MÉTHODES DE GESTION ADMINISTRATIVE ---
    InvoiceDTO create(InvoiceDTO invoiceDTO);
    InvoiceDTO update(Long id, InvoiceDTO invoiceDTO);
    InvoiceDTO getById(Long id);
    InvoiceDTO getByCode(String code);
    PageResponse<InvoiceDTO> getAll(Pageable pageable);
    PageResponse<InvoiceDTO> getByPatient(Long patientId, Pageable pageable);
    PageResponse<InvoiceDTO> getByStatus(InvoiceStatus status, Pageable pageable);
    InvoiceDTO processPayment(Long id, BigDecimal amount, PaymentMethod paymentMethod);
    InvoiceDTO cancelInvoice(Long id);
    BigDecimal calculateRevenue(LocalDateTime start, LocalDateTime end);
    BigDecimal getTotalPending();
    void delete(Long id);

    // --- MÉTHODES POUR LE DASHBOARD PATIENT (LOGIQUE RÉELLE) ---

    /**
     * Récupère les factures du patient connecté via son email (sécurité JWT).
     */
    PageResponse<InvoiceDTO> getInvoicesByPatientEmail(String email, Pageable pageable);

    /**
     * Calcule les totaux (Payé, En attente, Cumul) pour les cartes du haut du Dashboard.
     */
    PatientDashboardStatsDTO getPatientDashboardStats(String email);

    /**
     * Génère le flux binaire du PDF pour une facture spécifique.
     * @param dto Les données de la facture à exporter.
     * @param outputStream Le flux de la réponse HTTP.
     */
    void exportToPDF(InvoiceDTO dto, OutputStream outputStream) throws IOException;

    // --- MÉTHODES POUR LE WORKFLOW DE PARCOURS PATIENT ---

    /**
     * Crée une facture lors de l'admission à la réception
     * @param patientId ID du patient
     * @param consultationId ID de la consultation créée
     * @param ficheAmount Montant des frais de fiche (0 si patient ancien)
     * @param consulAmount Montant de la consultation
     * @param serviceName Nom du service médical
     * @param createdBy Utilisateur qui crée la facture
     * @return La facture créée
     */
    InvoiceDTO createAdmissionInvoice(Long patientId, Long consultationId, 
            BigDecimal ficheAmount, BigDecimal consulAmount, String serviceName, Object createdBy);

    /**
     * Calcule les revenus totaux pour une date donnée
     * @param date La date pour laquelle calculer les revenus
     * @return Le revenu total du jour
     */
    BigDecimal calculateDailyRevenue(java.time.LocalDate date);

    /**
     * Récupère toutes les factures en attente de paiement
     * @return Liste des factures EN_ATTENTE
     */
    List<InvoiceDTO> getPendingInvoices();

    /**
     * Met à jour le statut de la facture et envoie une notification au département concerné
     * @param invoiceId ID de la facture
     * @param paymentMethod Méthode de paiement utilisée
     * @return La facture mise à jour
     */
    InvoiceDTO processPaymentAndNotify(Long invoiceId, PaymentMethod paymentMethod);

    /**
     * Factures EN_ATTENTE filtrées par département source
     */
    List<InvoiceDTO> getPendingInvoicesByDepartment(DepartmentSource source);

    /**
     * Statistiques (pendingCount, pendingAmount) par département source
     */
    Map<String, Object> getStatsByDepartment(DepartmentSource source);

    // --- MÉTHODES POUR LE FLUX PHARMACIE PRESCRIPTION ---

    /**
     * Crée une facture à partir d'une prescription validée par la pharmacie
     * @param prescriptionId ID de la prescription
     * @param createdBy Utilisateur qui crée la facture (pharmacien)
     * @return La facture créée avec statut EN_ATTENTE
     */
    InvoiceDTO createPrescriptionInvoice(Long prescriptionId, Object createdBy);

    /**
     * Génère automatiquement une facture pour une prescription (alias de createPrescriptionInvoice)
     * @param prescriptionId ID de la prescription
     * @return La facture créée avec statut EN_ATTENTE
     */
    InvoiceDTO generateInvoice(Long prescriptionId);

    /**
     * Traite le paiement d'une facture de prescription avec mise à jour du stock
     * @param invoiceId ID de la facture à payer
     * @param paymentMethod Méthode de paiement
     * @return La facture mise à jour avec statut PAYEE et stock mis à jour
     */
    InvoiceDTO processPrescriptionPayment(Long invoiceId, PaymentMethod paymentMethod);
}

