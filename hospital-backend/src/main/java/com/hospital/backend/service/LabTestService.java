package com.hospital.backend.service;

import com.hospital.backend.dto.LabTestDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.dto.UserDTO; // Assurez-vous d'avoir ce DTO pour la liste des médecins
import com.hospital.backend.entity.LabTestStatus;
import org.springframework.data.domain.Pageable;
import java.util.List;

/**
 * Service pour la gestion des tests de laboratoire
 */
public interface LabTestService {

    // Création d'un test
    LabTestDTO create(LabTestDTO labTestDTO);

    // Mise à jour d'un test
    LabTestDTO update(Long id, LabTestDTO labTestDTO);

    // Récupération d'un test
    LabTestDTO getById(Long id);
    LabTestDTO getByCode(String code);

    // Récupération paginée générale
    PageResponse<LabTestDTO> getAll(Pageable pageable);

    // Récupération par entité liée
    PageResponse<LabTestDTO> getByPatient(Long patientId, Pageable pageable);
    PageResponse<LabTestDTO> getByConsultation(Long consultationId, Pageable pageable);

    // Récupération par statut simple
    PageResponse<LabTestDTO> getByStatus(LabTestStatus status, Pageable pageable);

    /**
     * GESTION DE LA FILE D'ATTENTE (LABORATOIRE)
     * Dans l'implémentation, cette méthode doit appeler :
     * labTestRepository.findByStatusAndFromFinance(LabTestStatus.EN_ATTENTE, true, pageable)
     */
    PageResponse<LabTestDTO> getQueue(Pageable pageable);

    /**
     * Utilisé par la Caisse pour envoyer un test au Labo
     * Doit forcer : status = EN_ATTENTE et fromFinance = true
     */
    LabTestDTO addToQueue(LabTestDTO labTestDTO);

    // Ancienne méthode (gardée pour compatibilité ou filtres spécifiques)
    PageResponse<LabTestDTO> getPendingTests(Pageable pageable);

    // Ajout de résultats
    LabTestDTO addResults(Long id, String results, String interpretation);

    // Mise à jour du statut (ex: passer de EN_ATTENTE à EN_COURS)
    LabTestDTO updateStatus(Long id, LabTestStatus status);

    // Suppression
    void delete(Long id);

    /**
     * Récupère les tests actifs pour un patient (EN_ATTENTE, EN_COURS)
     * Utile pour éviter les doublons ou voir le travail en cours
     */
    List<LabTestDTO> getActiveTestsForPatient(Long patientId);

    /**
     * Soumission groupée de résultats (pour les dossiers multi-examens)
     */
    com.hospital.backend.dto.BatchSubmitResult submitBatchResults(com.hospital.backend.dto.BatchResultRequest request);

    /**
     * ✅ NOUVEAU : Récupère la liste des utilisateurs ayant le rôle 'DOCTEUR'
     * Utilisé par le labo pour choisir le destinataire des résultats
     */
    List<UserDTO> getAvailableDoctors();

    /**
     * ✅ NOUVEAU : Envoie les résultats à un médecin spécifique
     * Cette méthode doit mettre à jour :
     * 1. Les résultats et l'interprétation
     * 2. Le doctor_recipient_id
     * 3. Le statut du test à 'TERMINE'
     * 4. Optionnellement : changer le statut de la consultation liée en 'RESULTATS_DISPONIBLES'
     */
    void sendResultsToDoctor(com.hospital.backend.dto.BatchResultRequest request);

    /**
     * ✅ NOUVEAU : Récupère les tests terminés adressés à un docteur spécifique
     * Permet au docteur de voir ses notifications de résultats
     */
    List<LabTestDTO> getResultsByDoctor(Long doctorId);

    /**
     * ✅ NOUVEAU : Récupère tous les tests envoyés à un docteur (tous statuts)
     * Utilisé par le docteur connecté pour voir tous ses résultats de laboratoire
     */
    List<LabTestDTO> getTestsByDoctor(Long doctorId);

    /**
     * ✅ NOUVEAU : Récupère l'historique des résultats terminés pour un patient
     * (Consultable par le docteur lors de la rédaction de la prescription)
     */
    List<LabTestDTO> getFinishedResultsByPatient(Long patientId);
}