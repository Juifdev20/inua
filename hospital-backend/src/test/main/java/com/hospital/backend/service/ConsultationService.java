package com.hospital.backend.service;

import com.hospital.backend.dto.ConsultationDTO;
import com.hospital.backend.dto.DecisionRequest;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.entity.ConsultationStatus;
import org.springframework.data.domain.Pageable;
import java.time.LocalDate;
import java.util.List;

/**
 * Service gérant le cycle de vie d'une consultation,
 * de la prise de RDV par le patient à la clôture par le docteur.
 */
public interface ConsultationService {

    // --- MÉTHODES POUR LE PATIENT ---

    /**
     * Initialise la fiche de consultation lors de la prise de rendez-vous.
     */
    ConsultationDTO createAppointmentForPatient(ConsultationDTO consultationDTO, String username);

    /**
     * Récupère tous les rendez-vous du patient connecté.
     */
    List<ConsultationDTO> getConsultationsForCurrentPatient(String username);

    /**
     * Permet au patient d'accepter une nouvelle date proposée par le docteur.
     */
    ConsultationDTO acceptReschedule(Long id);

    // --- MÉTHODES DE GESTION & RECHERCHE ---

    ConsultationDTO create(ConsultationDTO consultationDTO);

    ConsultationDTO update(Long id, ConsultationDTO consultationDTO);

    ConsultationDTO getById(Long id);

    ConsultationDTO getByCode(String code);

    PageResponse<ConsultationDTO> getAll(Pageable pageable);

    PageResponse<ConsultationDTO> getByPatient(Long patientId, Pageable pageable);

    PageResponse<ConsultationDTO> getByDoctor(Long doctorId, Pageable pageable);

    PageResponse<ConsultationDTO> getByStatus(ConsultationStatus status, Pageable pageable);

    /**
     * ✅ RÉCUPÉRATION DE L'HISTORIQUE DOCTEUR (Terminés, Annulés, Archivés)
     */
    PageResponse<ConsultationDTO> getDoctorHistory(Long doctorId, Pageable pageable);

    /**
     * ✅ RÉCUPÉRATION DES RDV PAR DATE (Pour l'Agenda fonctionnel)
     */
    List<ConsultationDTO> getDoctorAppointmentsByDate(Long doctorId, LocalDate date);

    // --- WORKFLOW ET ÉTATS ---

    /**
     * Traite la décision du docteur sur une demande de RDV.
     */
    ConsultationDTO processDoctorDecision(Long id, DecisionRequest request);

    /**
     * Mise à jour simple du statut (ex: passage à TERMINE ou ANNULE).
     */
    ConsultationDTO updateStatus(Long id, ConsultationStatus status);

    /**
     * Déclenche le début effectif de la consultation (Patient appelé en salle).
     */
    ConsultationDTO startConsultation(Long id);

    /**
     * ✅ ARCHIVAGE : Pour rendre le bouton "Archiver" fonctionnel
     */
    ConsultationDTO archiveConsultation(Long id);

    // --- ENVOIS SERVICES TIERS ---

    ConsultationDTO sendToLab(Long id);

    ConsultationDTO sendToPharmacy(Long id);

    /**
     * Supprime physiquement ou marque comme annulé.
     */
    void delete(Long id);
}