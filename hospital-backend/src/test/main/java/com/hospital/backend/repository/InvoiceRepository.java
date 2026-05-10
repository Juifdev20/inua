package com.hospital.backend.repository;

import com.hospital.backend.entity.Invoice;
import com.hospital.backend.entity.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // --- RECHERCHE DE BASE ---
    Optional<Invoice> findByInvoiceCode(String invoiceCode);

    // --- FILTRAGE POUR ADMINISTRATION ---
    Page<Invoice> findByPatientId(Long patientId, Pageable pageable);

    Page<Invoice> findByStatus(InvoiceStatus status, Pageable pageable);

    // --- FILTRAGE SÉCURISÉ POUR LE PATIENT (DASHBOARD) ---
    Page<Invoice> findByPatientEmailOrderByCreatedAtDesc(String email, Pageable pageable);

    // --- NOUVEAU : COMPTEUR POUR LE DASHBOARD PATIENT ---
    /**
     * Compte le nombre total de factures pour un patient.
     * Utilisé pour incrémenter le compteur "Documents" sur le Dashboard.
     */
    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.patient.email = :email")
    long countByPatientEmail(@Param("email") String email);

    // --- STATISTIQUES POUR LE DASHBOARD PATIENT (CORRIGÉES) ---

    // 1. Somme totale facturée (Cumul de tous les montants)
    @Query("SELECT COALESCE(SUM(i.totalAmount), 0) FROM Invoice i WHERE i.patient.email = :email")
    BigDecimal sumTotalInvoicedByPatientEmail(@Param("email") String email);

    // 2. Somme réellement payée
    @Query("SELECT COALESCE(SUM(i.totalAmount), 0) FROM Invoice i WHERE i.patient.email = :email " +
            "AND i.status = com.hospital.backend.entity.InvoiceStatus.PAYEE")
    BigDecimal sumTotalPaidByPatientEmail(@Param("email") String email);

    // 3. Somme restant à payer
    @Query("SELECT COALESCE(SUM(i.totalAmount), 0) FROM Invoice i WHERE i.patient.email = :email " +
            "AND i.status != com.hospital.backend.entity.InvoiceStatus.PAYEE")
    BigDecimal sumPendingAmountByPatientEmail(@Param("email") String email);

    // --- STATISTIQUES GLOBALES (ADMINISTRATION) ---

    @Query("SELECT COALESCE(SUM(i.totalAmount), 0) FROM Invoice i WHERE i.status = com.hospital.backend.entity.InvoiceStatus.PAYEE " +
            "AND i.paidAt BETWEEN :start AND :end")
    BigDecimal calculateRevenueByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.status = :status")
    Long countByStatus(@Param("status") InvoiceStatus status);

    @Query("SELECT COALESCE(SUM(i.totalAmount), 0) FROM Invoice i WHERE i.status IN " +
            "(com.hospital.backend.entity.InvoiceStatus.EN_ATTENTE, com.hospital.backend.entity.InvoiceStatus.PARTIELLEMENT_PAYEE)")
    BigDecimal calculateTotalPending();
}