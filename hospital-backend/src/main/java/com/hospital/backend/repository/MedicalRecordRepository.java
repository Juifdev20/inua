package com.hospital.backend.repository;

import com.hospital.backend.entity.MedicalRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {

    Optional<MedicalRecord> findByRecordCode(String recordCode);

    Page<MedicalRecord> findByPatientId(Long patientId, Pageable pageable);

    List<MedicalRecord> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    // Version pour la liste simple (Ajoutée pour corriger l'erreur d'arguments)
    List<MedicalRecord> findByDoctorId(Long doctorId);

    // Version pour la pagination (Existante)
    Page<MedicalRecord> findByDoctorId(Long doctorId, Pageable pageable);

    // ✅ CORRECTION: Requête avec JOIN FETCH pour éviter le lazy loading
    @Query("SELECT mr FROM MedicalRecord mr LEFT JOIN FETCH mr.patient WHERE mr.doctor.id = :doctorId")
    List<MedicalRecord> findByDoctorIdWithPatient(@Param("doctorId") Long doctorId);
}