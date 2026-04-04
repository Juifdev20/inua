package com.hospital.backend.repository;

import com.hospital.backend.entity.MedicalRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {
    
    Optional<MedicalRecord> findByRecordCode(String recordCode);
    
    Page<MedicalRecord> findByPatientId(Long patientId, Pageable pageable);
    
    List<MedicalRecord> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    
    Page<MedicalRecord> findByDoctorId(Long doctorId, Pageable pageable);
}
