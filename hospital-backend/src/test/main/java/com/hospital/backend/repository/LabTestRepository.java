package com.hospital.backend.repository;

import com.hospital.backend.entity.LabTest;
import com.hospital.backend.entity.LabTestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface LabTestRepository extends JpaRepository<LabTest, Long> {
    
    Optional<LabTest> findByTestCode(String testCode);
    
    Page<LabTest> findByPatientId(Long patientId, Pageable pageable);
    
    Page<LabTest> findByConsultationId(Long consultationId, Pageable pageable);
    
    Page<LabTest> findByStatus(LabTestStatus status, Pageable pageable);
    
    @Query("SELECT l FROM LabTest l WHERE l.status = 'EN_ATTENTE' ORDER BY l.priority DESC, l.requestedAt ASC")
    List<LabTest> findPendingTests();
    
    @Query("SELECT COUNT(l) FROM LabTest l WHERE l.status = :status")
    Long countByStatus(@Param("status") LabTestStatus status);
}
