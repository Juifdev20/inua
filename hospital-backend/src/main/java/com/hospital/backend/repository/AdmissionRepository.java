package com.hospital.backend.repository;

import com.hospital.backend.entity.Admission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdmissionRepository extends JpaRepository<Admission, Long> {
    
    List<Admission> findByPatientId(Long patientId);

    List<Admission> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    Optional<Admission> findTopByPatientIdOrderByCreatedAtDesc(Long patientId);
    
    List<Admission> findByDoctorId(Long doctorId);
    
    List<Admission> findByStatus(Admission.AdmissionStatus status);
    
    boolean existsByPatientId(Long patientId);

    List<Admission> findByCompanyIdAndAdmissionDateBetween(Long companyId, java.time.LocalDateTime start, java.time.LocalDateTime end);
}
