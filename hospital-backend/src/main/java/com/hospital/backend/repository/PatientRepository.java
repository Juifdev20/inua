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
import java.util.List;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

    // ✅ Filtre de sécurité : Récupérer un patient par son code unique
    @Query("SELECT p FROM Patient p JOIN p.user u JOIN u.role r WHERE p.patientCode = :patientCode AND r.nom = 'ROLE_PATIENT'")
    Optional<Patient> findByPatientCode(@Param("patientCode") String patientCode);

    // ✅ Récupérer un patient par son email (avec vérification du rôle)
    @Query("SELECT p FROM Patient p JOIN p.user u JOIN u.role r WHERE p.email = :email AND r.nom = 'ROLE_PATIENT'")
    Optional<Patient> findByEmail(@Param("email") String email);

    Boolean existsByEmail(String email);

    /**
     * ✅ Liste paginée des patients ACTIFS (Interface Réception/Standard)
     */
    @Query("SELECT p FROM Patient p JOIN p.user u JOIN u.role r WHERE p.isActive = true AND r.nom = 'ROLE_PATIENT'")
    Page<Patient> findByIsActiveTrue(Pageable pageable);

    /**
     * ✅ Liste paginée des patients ARCHIVÉS (Vue Archives)
     */
    @Query("SELECT p FROM Patient p JOIN p.user u JOIN u.role r WHERE p.isActive = false AND r.nom = 'ROLE_PATIENT'")
    Page<Patient> findByIsActiveFalse(Pageable pageable);

    /**
     * ✅ Surcharge du findAll pour ne retourner QUE les patients (Exclut le personnel hospitalier)
     */
    @Override
    @Query("SELECT p FROM Patient p JOIN p.user u JOIN u.role r WHERE r.nom = 'ROLE_PATIENT'")
    Page<Patient> findAll(Pageable pageable);

    /**
     * ✅ Liste complète pour les menus déroulants (Uniquement Actifs)
     */
    @Query("SELECT p FROM Patient p JOIN p.user u JOIN u.role r WHERE p.isActive = true AND r.nom = 'ROLE_PATIENT'")
    List<Patient> findAllActivePatients();

    /**
     * ✅ Trouve le profil patient lié à son compte utilisateur (Profil personnel)
     */
    @Query("SELECT p FROM Patient p JOIN p.user u JOIN u.role r WHERE p.user = :user AND r.nom = 'ROLE_PATIENT'")
    Optional<Patient> findByUser(@Param("user") User user);

    /**
     * ✅ Recherche par email ou nom d'utilisateur
     */
    @Query("SELECT p FROM Patient p JOIN p.user u JOIN u.role r WHERE (p.email = :input OR u.username = :input) AND r.nom = 'ROLE_PATIENT'")
    Optional<Patient> findByEmailOrUsername(@Param("input") String input);

    /**
     * ✅ RECHERCHE AVANCÉE (ACTIFS UNIQUEMENT)
     * Ajout de la recherche par Profession et Téléphone pour exploiter les nouveaux champs.
     */
    @Query("SELECT p FROM Patient p JOIN p.user u JOIN u.role r WHERE r.nom = 'ROLE_PATIENT' AND p.isActive = true AND (" +
            "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.patientCode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.phoneNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.profession) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Patient> searchActivePatients(@Param("search") String search, Pageable pageable);

    /**
     * ✅ RECHERCHE GLOBALE (Tout statut)
     */
    @Query("SELECT p FROM Patient p JOIN p.user u JOIN u.role r WHERE r.nom = 'ROLE_PATIENT' AND (" +
            "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.patientCode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.phoneNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.profession) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Patient> searchPatients(@Param("search") String search, Pageable pageable);

    /**
     * ✅ Recherche simplifiée pour les dropdowns de triage
     */
    @Query("SELECT p FROM Patient p JOIN p.user u JOIN u.role r WHERE r.nom = 'ROLE_PATIENT' AND p.isActive = true AND (" +
            "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.patientCode) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Patient> searchActivePatientsList(@Param("search") String search);

    /**
     * ✅ Statistiques : Nombre total de patients actifs
     */
    @Query("SELECT COUNT(p) FROM Patient p JOIN p.user u JOIN u.role r WHERE p.isActive = true AND r.nom = 'ROLE_PATIENT'")
    Long countActivePatients();

    // ==========================================
    // ✅ MÉTHODES LIÉES AU DOCTEUR (Dashboard)
    // ==========================================

    /**
     * Compte le nombre de patients uniques ayant consulté un docteur spécifique
     */
    @Query("SELECT COUNT(DISTINCT p) FROM Patient p JOIN p.user u JOIN u.role r WHERE p.isActive = true " +
            "AND r.nom = 'ROLE_PATIENT' AND " +
            "p.id IN (SELECT c.patient.id FROM Consultation c WHERE c.doctor.email = :email)")
    long countByDoctorEmail(@Param("email") String email);

    /**
     * Recherche dans la liste des patients d'un docteur spécifique
     */
    @Query("SELECT p FROM Patient p JOIN p.user u JOIN u.role r WHERE r.nom = 'ROLE_PATIENT' AND p.isActive = true AND p.id IN " +
            "(SELECT DISTINCT c.patient.id FROM Consultation c WHERE c.doctor.email = :email) " +
            "AND (LOWER(p.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Patient> searchPatientsByDoctor(@Param("email") String email, @Param("search") String search, Pageable pageable);
}