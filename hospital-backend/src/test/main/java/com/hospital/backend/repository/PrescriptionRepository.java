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
    
    Page<Prescription> findByStatus(PrescriptionStatus status, Pageable pageable);
    
    @Query("SELECT p FROM Prescription p WHERE p.status = 'EN_ATTENTE' ORDER BY p.createdAt ASC")
    List<Prescription> findPendingPrescriptions();
    
    @Query("SELECT COUNT(p) FROM Prescription p WHERE p.status = :status")
    Long countByStatus(@Param("status") PrescriptionStatus status);
}
