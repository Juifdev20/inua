package com.hospital.backend.service;

import com.hospital.backend.dto.InvoiceDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.dto.PatientDashboardStatsDTO;
import com.hospital.backend.entity.InvoiceStatus;
import com.hospital.backend.entity.PaymentMethod;
import org.springframework.data.domain.Pageable;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;

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
}