package com.hospital.backend.service;

import com.hospital.backend.dto.FinaliserConsultationRequest;
import com.hospital.backend.dto.PatientJourneyDTO;
import com.hospital.backend.dto.AdjustExamRequest.ExamAdjustmentDTO;
import com.hospital.backend.dto.AdmissionDTO;
import com.hospital.backend.dto.ConsultationDTO;
import com.hospital.backend.dto.ConsultationListDTO;
import com.hospital.backend.dto.DecisionRequest;
import com.hospital.backend.dto.TerminationDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.entity.Consultation;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Service gérant le cycle de vie d'une consultation,
 * de la prise de RDV par le patient à la clôture par le docteur.
 */
public interface ConsultationService {

    // --- MÉTHODES UTILITAIRES ---

    /**
     * Convertit une entité Consultation en ConsultationDTO
     * @param consultation L'entité à convertir
     * @return Le DTO correspondant
     */
    ConsultationDTO mapToDTO(Consultation consultation);

    /**
     * Met à jour une consultation avec les données du DTO
     * @param id L'ID de la consultation à mettre à jour
     * @param consultationDTO Les nouvelles données
     * @return Le DTO mis à jour
     */
    ConsultationDTO updateConsultation(Long id, ConsultationDTO consultationDTO);

    /**
     * Crée une prescription d'examens pour une consultation
     * @param consultationId L'ID de la consultation
     * @param serviceIds Liste des IDs de services à prescrire
     * @return Le DTO de la consultation mis à jour
     */
    ConsultationDTO createPrescription(Long consultationId, List<Long> serviceIds, List<String> doctorNotes);

    /**
     * Calcule le montant total des examens prescrits pour une consultation
     * @param consultationId L'ID de la consultation
     * @return Le montant total calculé
     */
    BigDecimal calculatePrescriptionTotal(Long consultationId);

    /**
     * Met à jour le statut de paiement des examens (examAmountPaid)
     * @param consultationId L'ID de la consultation
     * @param amountPaid Montant payé pour les examens
     * @return Le DTO mis à jour
     */
    ConsultationDTO updatePaymentStatus(Long consultationId, BigDecimal amountPaid);

    /**
     * ✅ NOUVEAU: Met à jour le paiement de la consultation (consulAmountPaid)
     * @param consultationId ID de la consultation
     * @param consulAmountPaid Montant payé pour la consultation
     * @return Consultation mise à jour
     */
    ConsultationDTO updateConsultationPayment(Long consultationId, Double consulAmountPaid);

    /**
     * Récupère la liste des paiements en attente pour la réception
     * @return Liste des DTO avec les informations de paiement
     */
    List<com.hospital.backend.dto.PendingPaymentDTO> getPendingPayments();

    /**
     * Récupère les consultations en attente de paiement labo pour la réception
     * @return Liste des DTO avec les informations nécessaires
     */
    List<com.hospital.backend.dto.ReceptionPaymentDTO> getReceptionPendingPayments();

    /**
     * Récupère les consultations traitées aujourd'hui
     * @return Liste des consultations traitées aujourd'hui
     */
    List<com.hospital.backend.dto.TodayProcessedDTO> getTodayProcessedConsultations();

    /**
     * Récupère les statistiques de la réception
     * @return Statistiques quotidiennes
     */
    com.hospital.backend.dto.ReceptionStatsDTO getReceptionStats();

    /**
     * Met à jour le paiement et envoie au laboratoire
     * @param consultationId ID de la consultation
     * @param examAmountPaid Montant payé pour les examens
     * @return Consultation mise à jour
     */
    ConsultationDTO updateExamPaymentAndSendToLab(Long consultationId, Double examAmountPaid);

    /**
     * ✅ AJOUTÉ: Ajuste les examens prescrits (quantité, désactivation, notes caisse)
     * Appelé par la caisse avant paiement des examens labo
     * @param consultationId ID de la consultation
     * @param adjustments Liste des ajustements à appliquer
     * @return Consultation mise à jour
     */
    ConsultationDTO adjustPrescribedExam(Long consultationId, List<ExamAdjustmentDTO> adjustments);

    /**
     * Trouver une consultation par son ID
     * @param id ID de la consultation
     * @return Entité Consultation
     */
    Consultation findById(Long id);

    /**
     * Trouver les consultations par statut (String)
     * @param statut Statut à rechercher
     * @return Liste des consultations DTO
     */
    List<ConsultationDTO> findByStatut(String statut);

    /**
     * Récupérer toutes les consultations
     * @return Liste de toutes les consultations DTO
     */
    List<ConsultationDTO> getAllConsultations();

    /**
     * Termine une consultation et la met en attente de paiement
     * @param consultationId ID de la consultation
     * @param diagnostic Diagnostic du médecin
     * @param examenIds Liste des IDs des examens prescrits
     * @return ConsultationDTO mise à jour
     */
    ConsultationDTO terminerConsultation(Long consultationId, String diagnostic, List<Long> examenIds);

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

    /**
     * ✅ RÉCUPÉRATION DE L'HISTORIQUE PAR PATIENT (Format Liste pour le Dossier Patient)
     * Cette méthode est cruciale pour le frontend (PatientFolder.jsx)
     */
    List<ConsultationDTO> getHistoryByPatientId(Long patientId);

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
     * Crée ou lie une admission existante à une consultation
     */
    ConsultationDTO linkOrCreateAdmission(Long consultationId, AdmissionDTO admissionDTO);

    /**
     * Crée automatiquement une admission pour les consultations qui n'en ont pas
     */
    void migrateConsultationsWithoutAdmission();

    /**
     * ✅ NOUVEAU: Récupère les consultations optimisées pour un médecin avec JOIN FETCH
     */
    List<ConsultationListDTO> getConsultationsForDoctor(Long doctorId);

    /**
     * ✅ NOUVEAU: Termine une consultation et crée automatiquement une admission si nécessaire
     */
    ConsultationDTO terminerConsultation(Long id, TerminationDTO dto);

    /**
     * ✅ FINALISER: Finalise une consultation avec prescription et change le statut en TREATED
     */
    ConsultationDTO finaliserConsultation(Long id, FinaliserConsultationRequest request);

    /**
     * ✅ DOSSIER COMPLET: Génère le parcours patient complet (Triage, Labo, Prescription, Pharmacie, Finance)
     */
    PatientJourneyDTO getPatientJourney(Long consultationId);

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_PATIENT', 'ROLE_DOCTEUR', 'ROLE_RECEPTION')")
    void delete(Long id);
}