package com.hospital.backend.repository;

import com.hospital.backend.entity.Consultation;
import com.hospital.backend.entity.ConsultationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, Long> {

    // ✅ MÉTHODES DE RECHERCHE ET PAGINATION
    List<Consultation> findByPatientIdOrderByConsultationDateDesc(Long patientId);

    // ✅ HISTORIQUE FILTRÉ : Trié du plus récent au plus ancien
    Page<Consultation> findByDoctorIdAndStatusInOrderByConsultationDateDesc(Long doctorId, List<ConsultationStatus> statuses, Pageable pageable);

    // ✅ AGENDA : Recherche les rendez-vous d'un docteur pour une plage horaire précise (une journée)
    List<Consultation> findByDoctorIdAndConsultationDateBetween(Long doctorId, LocalDateTime start, LocalDateTime end);

    // Gardée pour compatibilité
    Page<Consultation> findByDoctorIdAndStatusIn(Long doctorId, List<ConsultationStatus> statuses, Pageable pageable);

    Optional<Consultation> findByConsultationCode(String consultationCode);

    Page<Consultation> findByPatientId(Long patientId, Pageable pageable);

    Page<Consultation> findByDoctorId(Long doctorId, Pageable pageable);

    Page<Consultation> findByStatus(ConsultationStatus status, Pageable pageable);

    @Query("SELECT c FROM Consultation c WHERE c.doctor.id = :doctorId AND c.status = :status")
    List<Consultation> findByDoctorAndStatus(@Param("doctorId") Long doctorId, @Param("status") ConsultationStatus status);

    @Query("SELECT c FROM Consultation c WHERE c.consultationDate BETWEEN :start AND :end")
    List<Consultation> findByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(c) FROM Consultation c WHERE c.status = :status")
    Long countByStatus(@Param("status") ConsultationStatus status);

    // ✅ REQUÊTES POUR LES FLUX (LABO / PHARMACIE)
    @Query("SELECT c FROM Consultation c WHERE c.requiresLabTest = true AND c.status = com.hospital.backend.entity.ConsultationStatus.LABORATOIRE_EN_ATTENTE")
    List<Consultation> findPendingLabTests();

    @Query("SELECT c FROM Consultation c WHERE c.requiresPrescription = true AND c.status = com.hospital.backend.entity.ConsultationStatus.PHARMACIE_EN_ATTENTE")
    List<Consultation> findPendingPrescriptions();
    List<Consultation> findByDoctorId(Long doctorId);

    // ==========================================
    // ✅ MÉTHODES DASHBOARD DOCTEUR (OPTIMISÉES)
    // ==========================================

    /**
     * Compte les rendez-vous du jour pour un docteur spécifique via son ID
     */
    @Query("SELECT COUNT(c) FROM Consultation c WHERE c.doctor.id = :doctorId " +
            "AND c.consultationDate BETWEEN :start AND :end")
    long countTodayConsultationsByDoctorId(@Param("doctorId") Long doctorId,
                                           @Param("start") LocalDateTime start,
                                           @Param("end") LocalDateTime end);

    /**
     * Liste les rendez-vous du jour pour un docteur spécifique
     */
    @Query("SELECT c FROM Consultation c WHERE c.doctor.id = :doctorId " +
            "AND c.consultationDate BETWEEN :start AND :end " +
            "ORDER BY c.consultationDate ASC")
    List<Consultation> findTodayConsultationsByDoctorId(@Param("doctorId") Long doctorId,
                                                        @Param("start") LocalDateTime start,
                                                        @Param("end") LocalDateTime end);

    /**
     * Compte par statut pour un docteur spécifique
     */
    @Query("SELECT COUNT(c) FROM Consultation c WHERE c.doctor.id = :doctorId AND c.status = :status")
    long countByDoctorIdAndStatus(@Param("doctorId") Long doctorId, @Param("status") ConsultationStatus status);

    /**
     * Récupère l'historique récent d'un docteur avec pagination
     */
    @Query("SELECT c FROM Consultation c WHERE c.doctor.id = :doctorId ORDER BY c.consultationDate DESC")
    List<Consultation> findRecentByDoctorId(@Param("doctorId") Long doctorId, Pageable pageable);

    /**
     * ✅ AJOUT : Compte les consultations par email de docteur et statut
     */
    @Query("SELECT COUNT(c) FROM Consultation c WHERE c.doctor.email = :email AND c.status = :status")
    long countByDoctorEmailAndStatus(@Param("email") String email, @Param("status") ConsultationStatus status);

    /**
     * ✅ AJOUT : Compte les consultations du jour par email
     */
    @Query("SELECT COUNT(c) FROM Consultation c WHERE c.doctor.email = :email " +
            "AND c.consultationDate BETWEEN :start AND :end")
    long countTodayConsultationsByDoctorEmail(@Param("email") String email,
                                              @Param("start") LocalDateTime start,
                                              @Param("end") LocalDateTime end);

    // ✅ MÉTHODES PAR EMAIL (GARDÉES POUR COMPATIBILITÉ)
    @Query("SELECT c FROM Consultation c WHERE c.doctor.email = :email AND c.consultationDate BETWEEN :start AND :end ORDER BY c.consultationDate ASC")
    List<Consultation> findTodayConsultationsByDoctorEmail(@Param("email") String email, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}