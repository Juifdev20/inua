package com.hospital.backend.repository;

import com.hospital.backend.entity.PatientDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository pour la gestion des documents patients
 */
@Repository
public interface PatientDocumentRepository extends JpaRepository<PatientDocument, Long> {

    /**
     * Récupérer tous les documents triés par date de création décroissante
     */
    @Query("SELECT d FROM PatientDocument d ORDER BY d.createdAt DESC")
    List<PatientDocument> findAllOrderByCreatedAtDesc();

    /**
     * Récupérer tous les documents avec pagination
     */
    Page<PatientDocument> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Rechercher par nom de patient (contient)
     */
    @Query("SELECT d FROM PatientDocument d WHERE LOWER(d.patientName) LIKE LOWER(CONCAT('%', :patientName, '%')) ORDER BY d.createdAt DESC")
    List<PatientDocument> findByPatientNameContaining(@Param("patientName") String patientName);

    /**
     * Rechercher par ID de patient
     */
    List<PatientDocument> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    /**
     * Rechercher par ID de consultation
     */
    Optional<PatientDocument> findByConsultationId(Long consultationId);

    /**
     * Vérifier si un document existe pour une consultation
     */
    boolean existsByConsultationId(Long consultationId);

    /**
     * Rechercher par nom de fichier (contient)
     */
    @Query("SELECT d FROM PatientDocument d WHERE LOWER(d.fileName) LIKE LOWER(CONCAT('%', :fileName, '%')) ORDER BY d.createdAt DESC")
    List<PatientDocument> findByFileNameContaining(@Param("fileName") String fileName);

    /**
     * Compter les documents d'un patient
     */
    long countByPatientId(Long patientId);
}

