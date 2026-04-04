package com.hospital.backend.repository;

import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.entity.PrescribedExam;
import com.hospital.backend.entity.PrescribedExamStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface PrescribedExamRepository extends JpaRepository<PrescribedExam, Long> {

    // ══════════════════════════════════════════════════════════════
    // REQUÊTES DE BASE (conservées)
    // ══════════════════════════════════════════════════════════════

    List<PrescribedExam> findByConsultationId(Long consultationId);

    List<PrescribedExam> findByConsultationIdOrderByCreatedAtDesc(Long consultationId);

    List<PrescribedExam> findByConsultationIdAndActiveTrue(Long consultationId);

    List<PrescribedExam> findByConsultationIdAndActiveTrueOrderByCreatedAtDesc(Long consultationId);

    List<PrescribedExam> findByConsultationIdAndStatus(Long consultationId, PrescribedExamStatus status);

    List<PrescribedExam> findByStatus(PrescribedExamStatus status);

    List<PrescribedExam> findByStatusIn(List<PrescribedExamStatus> statuses);

    // ══════════════════════════════════════════════════════════════
    // REQUÊTES OPTIMISÉES AVEC JOIN FETCH (★ RECOMMANDÉ)
    // ══════════════════════════════════════════════════════════════

    /**
     * ★ Récupère un examen avec son service (évite N+1)
     */
    @Query("SELECT pe FROM PrescribedExam pe " +
            "LEFT JOIN FETCH pe.service " +
            "WHERE pe.id = :id")
    Optional<PrescribedExam> findByIdWithService(@Param("id") Long id);

    /**
     * ★ Récupère tous les examens d'une consultation avec leurs services
     * Utilisé par la caisse pour afficher les détails
     */
    @Query("SELECT pe FROM PrescribedExam pe " +
            "LEFT JOIN FETCH pe.service " +
            "WHERE pe.consultation.id = :consultationId " +
            "ORDER BY pe.createdAt DESC")
    List<PrescribedExam> findByConsultationIdWithService(@Param("consultationId") Long consultationId);

    /**
     * ★ Version optimisée pour la caisse (seulement les actifs)
     */
    @Query("SELECT pe FROM PrescribedExam pe " +
            "LEFT JOIN FETCH pe.service " +
            "WHERE pe.consultation.id = :consultationId " +
            "AND (pe.active IS NULL OR pe.active = true) " +
            "ORDER BY pe.createdAt DESC")
    List<PrescribedExam> findActiveByConsultationIdWithService(@Param("consultationId") Long consultationId);

    // ══════════════════════════════════════════════════════════════
    // REQUÊTES WORKFLOW (conservées et optimisées)
    // ══════════════════════════════════════════════════════════════

    @Query("SELECT pe FROM PrescribedExam pe WHERE pe.consultation.status = :consultationStatus")
    List<PrescribedExam> findByConsultationStatus(@Param("consultationStatus") ConsultationStatus consultationStatus);

    @Query("SELECT pe FROM PrescribedExam pe " +
            "LEFT JOIN FETCH pe.service " +
            "LEFT JOIN FETCH pe.consultation c " +
            "LEFT JOIN FETCH c.patient " +
            "WHERE pe.consultation.status = com.hospital.backend.entity.ConsultationStatus.EXAMENS_PRESCRITS " +
            "AND (pe.active IS NULL OR pe.active = true)")
    List<PrescribedExam> findExamsAwaitingCashierValidation();

    @Query("SELECT pe FROM PrescribedExam pe " +
            "LEFT JOIN FETCH pe.service " +
            "WHERE pe.consultation.status = com.hospital.backend.entity.ConsultationStatus.EXAMENS_PAYES " +
            "AND (pe.active IS NULL OR pe.active = true)")
    List<PrescribedExam> findPaidExamsAwaitingLabTransfer();

    @Query("SELECT pe FROM PrescribedExam pe " +
            "LEFT JOIN FETCH pe.service " +
            "WHERE pe.consultation.status = com.hospital.backend.entity.ConsultationStatus.AU_LABO " +
            "AND (pe.active IS NULL OR pe.active = true)")
    List<PrescribedExam> findExamsAtLaboratory();

    // ══════════════════════════════════════════════════════════════
    // CALCULS FINANCIERS (conservés)
    // ══════════════════════════════════════════════════════════════

    @Query("SELECT COALESCE(SUM(pe.totalPrice), 0) FROM PrescribedExam pe " +
            "WHERE pe.consultation.id = :consultationId " +
            "AND (pe.active IS NULL OR pe.active = true)")
    BigDecimal calculateTotalAmountByConsultation(@Param("consultationId") Long consultationId);

    /**
     * ★ Calcule le total des examens actifs avec une quantité spécifique
     */
    @Query("SELECT COALESCE(SUM(pe.unitPrice * pe.quantity), 0) FROM PrescribedExam pe " +
            "WHERE pe.consultation.id = :consultationId " +
            "AND (pe.active IS NULL OR pe.active = true)")
    BigDecimal calculateAdjustedTotalByConsultation(@Param("consultationId") Long consultationId);
}