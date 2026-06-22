package com.hospital.backend.repository;

import com.hospital.backend.entity.MedicalService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalServiceRepository extends JpaRepository<MedicalService, Long> {
    List<MedicalService> findByIsActiveTrue();

    // ★ MULTI-TENANT: filtrer par hôpital
    List<MedicalService> findByHospitalId(Long hospitalId);
    List<MedicalService> findByHospitalIdAndIsActiveTrue(Long hospitalId);
}