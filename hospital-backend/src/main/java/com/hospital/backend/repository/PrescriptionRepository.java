package com.hospital.backend.repository;

import com.hospital.backend.entity.Prescription;
import com.hospital.backend.entity.PrescriptionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    
    Optional<Prescription> findByPrescriptionCode(String prescriptionCode);
    
    Page<Prescription> findByPatientId(Long patientId, Pageable pageable);
    
    Page<Prescription> findByDoctorId(Long doctorId, Pageable pageable);
    
    Page<Prescription> findByConsultationId(Long consultationId, Pageable pageable);

    /**
     * ✅ NOUVEAU : Récupère toutes les prescriptions d'une consultation (sans pagination)
     */
    @Query("SELECT p FROM Prescription p WHERE p.consultation.id = :consultationId ORDER BY p.createdAt DESC")
    List<Prescription> findAllByConsultationId(@Param("consultationId") Long consultationId);
    
    Page<Prescription> findByStatus(PrescriptionStatus status, Pageable pageable);
    
    @Query("SELECT p FROM Prescription p WHERE p.status IN ('EN_ATTENTE', 'PRESCRIPTION_ENVOYEE', 'VALIDEE', 'PAYEE', 'PARTIELLEMENT_DELIVREE') ORDER BY p.createdAt DESC")
    List<Prescription> findPendingPrescriptions();
    
    @Query("SELECT COUNT(p) FROM Prescription p WHERE p.status = :status")
    Long countByStatus(@Param("status") PrescriptionStatus status);
}
