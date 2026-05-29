package com.hospital.backend.repository;

import com.hospital.backend.entity.Prescription;
import com.hospital.backend.entity.PrescriptionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    
    Optional<Prescription> findByPrescriptionCode(String prescriptionCode);

    Page<Prescription> findByPatientId(Long patientId, Pageable pageable);

    List<Prescription> findAllByPatientId(Long patientId);
    
    Page<Prescription> findByDoctorId(Long doctorId, Pageable pageable);
    
    Page<Prescription> findByConsultationId(Long consultationId, Pageable pageable);

    /**
     * ✅ NOUVEAU : Récupère toutes les prescriptions d'une consultation (sans pagination)
     */
    @Query("SELECT p FROM Prescription p WHERE p.consultation.id = :consultationId ORDER BY p.createdAt DESC")
    List<Prescription> findAllByConsultationId(@Param("consultationId") Long consultationId);
    
    Page<Prescription> findByStatus(PrescriptionStatus status, Pageable pageable);
    
    @Query("SELECT p FROM Prescription p WHERE p.status IN ('PRESCRIPTION_ENVOYEE', 'VALIDEE', 'PAYEE') ORDER BY p.createdAt DESC")
    List<Prescription> findPendingPrescriptions();
    
    /**
     * ✅ Récupère les prescriptions payées dans une période donnée
     */
    @Query("SELECT p FROM Prescription p WHERE p.status = 'PAYEE' AND (COALESCE(p.paidAt, p.createdAt) BETWEEN :startDate AND :endDate OR p.createdAt BETWEEN :startDate AND :endDate) ORDER BY p.createdAt DESC")
    Page<Prescription> findPaidPrescriptionsByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate, Pageable pageable);
    
    @Query("SELECT COUNT(p) FROM Prescription p WHERE p.status = :status")
    Long countByStatus(@Param("status") PrescriptionStatus status);

    /**
     * =========================================================================
     * ✅ Récupère les prescriptions actives avec leurs items ayant des timeSlots
     * =========================================================================
     *
     * Utilisé par MedicationReminderService pour envoyer les rappels de prise.
     * Récupère uniquement les prescriptions PAYEE ou DELIVREE qui ont des items
     * avec des horaires de prise (timeSlots) définis.
     */
    @Query("SELECT DISTINCT p FROM Prescription p " +
           "JOIN FETCH p.items i " +
           "JOIN FETCH p.patient pt " +
           "JOIN FETCH pt.user u " +
           "WHERE p.status IN ('PAYEE', 'DELIVREE', 'PARTIELLEMENT_DELIVREE') " +
           "AND i.timeSlots IS NOT EMPTY")
    List<Prescription> findActivePrescriptionsWithTimeSlots();
}
