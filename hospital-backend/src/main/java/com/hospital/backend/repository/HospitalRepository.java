package com.hospital.backend.repository;

import com.hospital.backend.entity.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HospitalRepository extends JpaRepository<Hospital, Long> {

    Optional<Hospital> findByCode(String code);

    boolean existsByCode(String code);

    List<Hospital> findAllByIsActiveTrue();

    List<Hospital> findByRegistrationStatus(String registrationStatus);

    @Query("SELECT COUNT(u) FROM User u WHERE u.hospital.id = :hospitalId")
    long countUsersByHospitalId(Long hospitalId);

    @Query("SELECT COUNT(p) FROM Patient p WHERE p.hospital.id = :hospitalId")
    long countPatientsByHospitalId(Long hospitalId);

    @Query("SELECT u.id FROM User u WHERE u.hospital.id = :hospitalId")
    List<Long> findUserIdsByHospitalId(Long hospitalId);

    @Query("SELECT u.id FROM User u WHERE u.hospital.id = :hospitalId AND u.role.nom IN ('ROLE_DOCTOR', 'ROLE_LABO', 'ROLE_PHARMACY', 'ROLE_PHARMACIST', 'ROLE_RECEPTION', 'ROLE_FINANCE', 'ROLE_CAISSIER')")
    List<Long> findClinicalUserIdsByHospitalId(Long hospitalId);
}
