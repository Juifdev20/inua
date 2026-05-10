package com.hospital.backend.repository;

import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

    Optional<Patient> findByPatientCode(String patientCode);

    Optional<Patient> findByEmail(String email);

    Boolean existsByEmail(String email);

    Page<Patient> findByIsActiveTrue(Pageable pageable);

    /**
     * ✅ INDISPENSABLE : Trouve le profil patient lié à un compte utilisateur.
     * Cette méthode résout l'erreur de compilation dans ton ConsultationServiceImpl.
     */
    Optional<Patient> findByUser(User user);

    /**
     * ✅ RECHERCHE AVANCÉE : Trouve un patient par son propre email OU l'username de son compte User.
     */
    @Query("SELECT p FROM Patient p LEFT JOIN p.user u WHERE p.email = :input OR u.username = :input")
    Optional<Patient> findByEmailOrUsername(@Param("input") String input);

    @Query("SELECT p FROM Patient p WHERE " +
            "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.patientCode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.phoneNumber) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Patient> searchPatients(@Param("search") String search, Pageable pageable);

    @Query("SELECT COUNT(p) FROM Patient p WHERE p.isActive = true")
    Long countActivePatients();

    // ==========================================
    // ✅ MÉTHODES LIÉES AU DOCTEUR
    // ==========================================

    /**
     * ✅ Compte les patients uniques ayant eu au moins une consultation avec ce docteur.
     */
    @Query("SELECT COUNT(DISTINCT p) FROM Patient p WHERE p.isActive = true AND " +
            "p.id IN (SELECT c.patient.id FROM Consultation c WHERE c.doctor.email = :email)")
    long countByDoctorEmail(@Param("email") String email);

    /**
     * ✅ Recherche uniquement les patients vus par ce docteur.
     */
    @Query("SELECT p FROM Patient p WHERE p.id IN " +
            "(SELECT DISTINCT c.patient.id FROM Consultation c WHERE c.doctor.email = :email) " +
            "AND (LOWER(p.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Patient> searchPatientsByDoctor(@Param("email") String email, @Param("search") String search, Pageable pageable);
}