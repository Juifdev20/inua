package com.hospital.backend.repository;

import com.hospital.backend.entity.LabTest;
import com.hospital.backend.entity.LabTestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface LabTestRepository extends JpaRepository<LabTest, Long> {

    Optional<LabTest> findByTestCode(String testCode);

    Page<LabTest> findByPatientId(Long patientId, Pageable pageable);

    @Query("SELECT lt FROM LabTest lt LEFT JOIN FETCH lt.consultation c LEFT JOIN FETCH lt.patient p LEFT JOIN FETCH lt.requestedBy rb LEFT JOIN FETCH lt.processedBy pb LEFT JOIN FETCH lt.doctorRecipient dr WHERE lt.consultation.id = :consultationId")
    Page<LabTest> findByConsultationId(@Param("consultationId") Long consultationId, Pageable pageable);

    /**
     * ✅ NOUVEAU : Récupère tous les tests d'une consultation (sans pagination)
     */
    @Query("SELECT l FROM LabTest l WHERE l.consultation.id = :consultationId ORDER BY l.requestedAt DESC")
    List<LabTest> findAllByConsultationId(@Param("consultationId") Long consultationId);

    Page<LabTest> findByStatus(LabTestStatus status, Pageable pageable);

    /**
     * Récupère tous les tests selon un statut spécifique (ex: EN_ATTENTE)
     */
    @Query("SELECT l FROM LabTest l WHERE l.status = :status ORDER BY l.priority DESC, l.requestedAt ASC")
    List<LabTest> findByStatusCustom(@Param("status") LabTestStatus status);

    @Query("SELECT COUNT(l) FROM LabTest l WHERE l.status = :status")
    Long countByStatus(@Param("status") LabTestStatus status);

    /**
     * File d'attente filtrée par statut ET provenance finance (Paiement validé)
     * Correction : On utilise les paramètres :status et :fromFinance pour éviter les conflits de type
     */
    @Query("SELECT l FROM LabTest l WHERE l.status = :status AND l.fromFinance = :fromFinance ORDER BY l.priority DESC, l.requestedAt ASC")
    Page<LabTest> findByStatusAndFromFinance(
            @Param("status") LabTestStatus status,
            @Param("fromFinance") boolean fromFinance,
            Pageable pageable
    );

    /**
     * Compte les tests selon le statut et la provenance
     */
    @Query("SELECT COUNT(l) FROM LabTest l WHERE l.status = :status AND l.fromFinance = :fromFinance")
    Long countByStatusAndFromFinance(
            @Param("status") LabTestStatus status,
            @Param("fromFinance") boolean fromFinance
    );

    /**
     * Récupère les tests actifs pour un patient spécifique
     */
    @Query("SELECT t FROM LabTest t WHERE t.patient.id = :patientId AND t.status IN :statuses")
    List<LabTest> findByPatientIdAndStatusIn(
            @Param("patientId") Long patientId,
            @Param("statuses") List<LabTestStatus> statuses
    );

    // ✅ FIX: Ajout d'une méthode pour récupérer tous les tests avec fromFinance = true
    @Query("SELECT l FROM LabTest l WHERE l.fromFinance = true ORDER BY l.requestedAt DESC")
    Page<LabTest> findAllFromFinance(Pageable pageable);

    /**
     * ✅ NOUVEAU : Récupère les tests terminés adressés à un docteur spécifique
     * Utilisé pour l'affichage des alertes/résultats côté Docteur
     */
    @Query("SELECT l FROM LabTest l WHERE l.doctorRecipient.id = :doctorId AND l.status = :status ORDER BY l.processedAt DESC")
    List<LabTest> findByDoctorRecipientIdAndStatus(
            @Param("doctorId") Long doctorId,
            @Param("status") LabTestStatus status
    );

    /**
     * ✅ NOUVEAU : Récupère tous les tests envoyés à un médecin (tous statuts)
     */
    @Query("SELECT l FROM LabTest l WHERE l.doctorRecipient.id = :doctorId ORDER BY l.processedAt DESC")
    List<LabTest> findByDoctorRecipientId(@Param("doctorId") Long doctorId);

    /**
     * ✅ NOUVEAU : Récupère l'historique complet des tests d'un patient validés par le labo
     */
    @Query("SELECT l FROM LabTest l WHERE l.patient.id = :patientId AND l.status = 'TERMINE' ORDER BY l.processedAt DESC")
    List<LabTest> findFinishedTestsByPatient(@Param("patientId") Long patientId);
}