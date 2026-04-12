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

    // ==========================================
    // ✅ AJOUTS POUR LE NOUVEAU WORKFLOW LABO
    // ==========================================

    /**
     * ★ CRITIQUE: Récupère plusieurs statuts avec JOIN FETCH Patient
     * Utilisé par /pending-payments pour éviter les N+1 queries
     */
    @Query("SELECT DISTINCT c FROM Consultation c " +
            "LEFT JOIN FETCH c.patient " +
            "LEFT JOIN FETCH c.doctor " +
            "WHERE c.status IN :statuses " +
            "ORDER BY c.createdAt DESC")
    List<Consultation> findByStatusInWithPatientAndDoctor(
            @Param("statuses") List<ConsultationStatus> statuses);

    /**
     * ★ CRITIQUE: Récupère TOUTES les consultations sans filtre de statut
     * Utilisé par /all-lab-payments pour afficher tous les examens (pending + payés)
     */
    @Query("SELECT DISTINCT c FROM Consultation c " +
            "LEFT JOIN FETCH c.patient " +
            "LEFT JOIN FETCH c.doctor " +
            "ORDER BY c.createdAt DESC")
    List<Consultation> findAllWithPatientAndDoctor();

    /**
     * ★ CRITIQUE: Récupère les examens prescrits d'une consultation
     * Évite le PrescribedExamRepository séparé dans certains cas
     */
    @Query("SELECT c FROM Consultation c " +
            "LEFT JOIN FETCH c.prescribedExams pe " +
            "LEFT JOIN FETCH pe.service " +
            "WHERE c.id = :id")
    Optional<Consultation> findByIdWithExams(@Param("id") Long id);

    /**
     * ★ CRITIQUE: Récupère les consultations avec examens prescrits pour la caisse laboratoire
     * Utilisé par /all-lab-payments pour charger correctement les relations
     */
    @Query("SELECT DISTINCT c FROM Consultation c " +
            "LEFT JOIN FETCH c.patient " +
            "LEFT JOIN FETCH c.doctor " +
            "LEFT JOIN FETCH c.prescribedExams pe " +
            "LEFT JOIN FETCH pe.service " +
            "WHERE c.status IN :statuses " +
            "ORDER BY c.createdAt DESC")
    List<Consultation> findByStatusInWithPatientDoctorAndExams(
            @Param("statuses") List<ConsultationStatus> statuses);

    /**
     * ★ CRITIQUE: Récupère les consultations avec examens prescrits filtrées par date
     * Utilisé par /all-lab-payments avec paramètre date pour le sélecteur de date
     * Filtre sur UPDATED_AT car c'est la date où les examens ont été prescrits (statut EXAMENS_PRESCRITS)
     */
    @Query("SELECT DISTINCT c FROM Consultation c " +
            "LEFT JOIN FETCH c.patient " +
            "LEFT JOIN FETCH c.doctor " +
            "LEFT JOIN FETCH c.prescribedExams pe " +
            "LEFT JOIN FETCH pe.service " +
            "WHERE c.status IN :statuses " +
            "AND c.updatedAt BETWEEN :startOfDay AND :endOfDay " +
            "ORDER BY c.updatedAt DESC")
    List<Consultation> findByStatusInAndCreatedAtBetweenWithPatientDoctorAndExams(
            @Param("statuses") List<ConsultationStatus> statuses,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay);

    // ══════════════════════════════════════════════════════════════
    // MÉTHODES EXISTANTES (conservées telles quelles)
    // ══════════════════════════════════════════════════════════════

    @Query("SELECT c FROM Consultation c " +
            "LEFT JOIN FETCH c.patient " +
            "LEFT JOIN FETCH c.doctor " +
            "LEFT JOIN FETCH c.admission a " +
            "LEFT JOIN FETCH c.prescribedExams pe " +
            "LEFT JOIN FETCH pe.service " +
            "WHERE c.doctor.id = :doctorId " +
            "ORDER BY c.createdAt DESC")
    List<Consultation> findByDoctorIdWithDetails(@Param("doctorId") Long doctorId);

    Page<Consultation> findByDoctorIdAndStatusInOrderByConsultationDateDesc(
            Long doctorId,
            List<ConsultationStatus> statuses,
            Pageable pageable
    );

    List<Consultation> findByDoctorIdAndConsultationDateBetween(
            Long doctorId,
            LocalDateTime start,
            LocalDateTime end
    );

    Page<Consultation> findByDoctorIdAndStatusIn(
            Long doctorId,
            List<ConsultationStatus> statuses,
            Pageable pageable
    );

    List<Consultation> findByStatusIn(List<ConsultationStatus> statuses);

    List<Consultation> findByStatus(ConsultationStatus status);

    // Méthode pour récupérer les admissions non archivées avec relations chargées
    @Query("SELECT c FROM Consultation c " +
            "LEFT JOIN FETCH c.patient " +
            "LEFT JOIN FETCH c.doctor " +
            "WHERE c.status != com.hospital.backend.entity.ConsultationStatus.ARCHIVED")
    List<Consultation> findNonArchivedConsultations();

    @Query("SELECT c FROM Consultation c " +
            "LEFT JOIN FETCH c.patient " +
            "LEFT JOIN FETCH c.invoice " +
            "WHERE c.status = :status " +
            "ORDER BY c.createdAt DESC")
    List<Consultation> findByStatusWithPatientOrderByCreatedAtDesc(
            @Param("status") ConsultationStatus status);

    @Query("SELECT DISTINCT c FROM Consultation c " +
            "LEFT JOIN FETCH c.patient " +
            "LEFT JOIN FETCH c.doctor " +
            "LEFT JOIN FETCH c.prescribedExams pe " +
            "LEFT JOIN FETCH pe.service " +
            "LEFT JOIN FETCH c.invoice " +
            "WHERE c.status = :status " +
            "ORDER BY c.createdAt DESC")
    List<Consultation> findByStatusWithPatientAndExamsOrderByCreatedAtDesc(
            @Param("status") ConsultationStatus status);

    @Query("SELECT DISTINCT c FROM Consultation c " +
            "LEFT JOIN FETCH c.patient " +
            "LEFT JOIN FETCH c.doctor " +
            "LEFT JOIN FETCH c.prescribedExams pe " +
            "LEFT JOIN FETCH pe.service " +
            "LEFT JOIN FETCH c.invoice " +
            "WHERE c.id = :id")
    Optional<Consultation> findByIdWithPatientAndExams(@Param("id") Long id);

    @Query("SELECT DISTINCT c FROM Consultation c " +
            "LEFT JOIN FETCH c.patient " +
            "LEFT JOIN FETCH c.doctor " +
            "LEFT JOIN FETCH c.prescribedExams pe " +
            "LEFT JOIN FETCH pe.service " +
            "WHERE c.status = :status " +
            "ORDER BY c.createdAt DESC")
    List<Consultation> findLabQueueByStatus(@Param("status") ConsultationStatus status);

    @Query("SELECT c FROM Consultation c WHERE c.status IN :statuses AND c.updatedAt BETWEEN :startOfDay AND :endOfDay")
    List<Consultation> findByStatusInAndUpdatedAtBetween(
            @Param("statuses") List<ConsultationStatus> statuses,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );

    List<Consultation> findByStatut(String statut);

    Optional<Consultation> findByConsultationCode(String consultationCode);

    Page<Consultation> findByPatientId(Long patientId, Pageable pageable);

    Page<Consultation> findByDoctorId(Long doctorId, Pageable pageable);

    Page<Consultation> findByStatus(ConsultationStatus status, Pageable pageable);

    @Query("SELECT c FROM Consultation c WHERE c.doctor.id = :doctorId AND c.status = :status")
    List<Consultation> findByDoctorAndStatus(
            @Param("doctorId") Long doctorId,
            @Param("status") ConsultationStatus status
    );

    @Query("SELECT c FROM Consultation c WHERE c.consultationDate BETWEEN :start AND :end")
    List<Consultation> findByDateRange(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT COUNT(c) FROM Consultation c WHERE c.status = :status AND c.status != 'ARCHIVED'")
    Long countByStatus(@Param("status") ConsultationStatus status);

    @Query("SELECT c FROM Consultation c WHERE c.requiresLabTest = true AND c.status = com.hospital.backend.entity.ConsultationStatus.LABORATOIRE_EN_ATTENTE")
    List<Consultation> findPendingLabTests();

    @Query("SELECT c FROM Consultation c WHERE c.requiresPrescription = true AND c.status = com.hospital.backend.entity.ConsultationStatus.PHARMACIE_EN_ATTENTE")
    List<Consultation> findPendingPrescriptions();

    List<Consultation> findByDoctorId(Long doctorId);

    /**
     * ✅ CORRECTION: Récupère les consultations avec JOIN FETCH patient et user
     * Pour éviter le lazy loading dans DoctorChatController
     */
    @Query("SELECT DISTINCT c FROM Consultation c " +
            "LEFT JOIN FETCH c.patient p " +
            "LEFT JOIN FETCH p.user " +
            "WHERE c.doctor.id = :doctorId")
    List<Consultation> findByDoctorIdWithPatient(@Param("doctorId") Long doctorId);

    @Query("SELECT COUNT(c) FROM Consultation c WHERE c.doctor.id = :doctorId " +
            "AND c.consultationDate BETWEEN :start AND :end")
    long countTodayConsultationsByDoctorId(
            @Param("doctorId") Long doctorId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT c FROM Consultation c WHERE c.doctor.id = :doctorId " +
            "AND c.consultationDate BETWEEN :start AND :end " +
            "ORDER BY c.consultationDate ASC")
    List<Consultation> findTodayConsultationsByDoctorId(
            @Param("doctorId") Long doctorId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT COUNT(c) FROM Consultation c WHERE c.doctor.id = :doctorId AND c.status = :status")
    long countByDoctorIdAndStatus(
            @Param("doctorId") Long doctorId,
            @Param("status") ConsultationStatus status
    );

    @Query("SELECT c FROM Consultation c WHERE c.doctor.id = :doctorId ORDER BY c.consultationDate DESC")
    List<Consultation> findRecentByDoctorId(
            @Param("doctorId") Long doctorId,
            Pageable pageable
    );

    @Query("SELECT COUNT(c) FROM Consultation c WHERE c.doctor.email = :email AND c.status = :status")
    long countByDoctorEmailAndStatus(
            @Param("email") String email,
            @Param("status") ConsultationStatus status
    );

    @Query("SELECT COUNT(c) FROM Consultation c WHERE c.doctor.email = :email " +
            "AND c.consultationDate BETWEEN :start AND :end")
    long countTodayConsultationsByDoctorEmail(
            @Param("email") String email,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT c FROM Consultation c WHERE c.doctor.email = :email AND c.consultationDate BETWEEN :start AND :end ORDER BY c.consultationDate ASC")
    List<Consultation> findTodayConsultationsByDoctorEmail(
            @Param("email") String email,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT COUNT(c) FROM Consultation c WHERE c.createdAt BETWEEN :startOfDay AND :endOfDay AND c.status != 'ARCHIVED'")
    long countAdmissionsToday(
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );

    @Query("SELECT COUNT(c) FROM Consultation c WHERE c.status IN :statuses AND c.status != 'ARCHIVED'")
    long countFichesTransmises(@Param("statuses") List<ConsultationStatus> statuses);

    @Query("SELECT COUNT(c) FROM Consultation c WHERE c.status IN :statuses AND c.updatedAt BETWEEN :startOfDay AND :endOfDay AND c.status != 'ARCHIVED'")
    long countTermineesToday(
            @Param("statuses") List<ConsultationStatus> statuses,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );

    @Query("SELECT c FROM Consultation c " +
            "LEFT JOIN FETCH c.patient " +
            "LEFT JOIN FETCH c.service " +
            "WHERE c.createdAt BETWEEN :startOfDay AND :endOfDay AND c.status != 'ARCHIVED' " +
            "ORDER BY c.createdAt DESC")
    List<Consultation> findRecentAdmissionsToday(
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay,
            Pageable pageable
    );

    List<Consultation> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    /**
     * Récupère les consultations d'un patient ordonnées par date de consultation
     * Utilisé par OnlineStatusController pour récupérer les médecins du patient
     */
    @Query("SELECT c FROM Consultation c " +
            "LEFT JOIN FETCH c.doctor d " +
            "LEFT JOIN FETCH d.department " +
            "WHERE c.patient.id = :patientId " +
            "ORDER BY c.consultationDate DESC")
    List<Consultation> findByPatientIdOrderByConsultationDateDesc(@Param("patientId") Long patientId);

    @Query("SELECT c FROM Consultation c WHERE c.patient.id = :patientId " +
            "AND c.ficheAmountPaid > 0 " +
            "ORDER BY c.createdAt DESC")
    List<Consultation> findLastPaidConsultation(@Param("patientId") Long patientId);
}