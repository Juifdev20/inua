package com.hospital.backend.service;

import com.hospital.backend.dto.PatientDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.dto.ChangePasswordRequest; // Ajouté
import org.springframework.data.domain.Pageable;

/**
 * Interface de service pour la gestion des patients.
 * Inclut les méthodes de manipulation de données, de recherche et de sécurité.
 */
public interface PatientService {

    /**
     * Crée un nouveau dossier patient.
     */
    PatientDTO create(PatientDTO patientDTO);

    /**
     * Met à jour un patient via son ID technique (Utile pour ADMIN/RECEPTION).
     */
    PatientDTO update(Long id, PatientDTO patientDTO);

    /**
     * Met à jour le dossier du patient via son email (Profil "Me").
     */
    PatientDTO updateByEmail(String email, PatientDTO patientDTO);

    /**
     * ✅ AJOUT : Met à jour le mot de passe de l'utilisateur lié au patient.
     * Utilisé pour le paramétrage du compte.
     */
    void updatePassword(String email, ChangePasswordRequest request);

    /**
     * Récupère un patient par son ID technique.
     */
    PatientDTO getById(Long id);

    /**
     * Récupère un patient par son code unique (ex: PAT-2024-XXXX).
     */
    PatientDTO getByCode(String patientCode);

    /**
     * Récupère le profil du patient connecté via son email.
     */
    PatientDTO getByEmail(String email);

    /**
     * Liste tous les patients avec pagination.
     */
    PageResponse<PatientDTO> getAll(Pageable pageable);

    /**
     * Recherche des patients par nom, téléphone ou code.
     */
    PageResponse<PatientDTO> search(String query, Pageable pageable);

    /**
     * Supprime définitivement un dossier patient (Réservé ADMIN).
     */
    void delete(Long id);

    /**
     * Désactive un dossier patient sans le supprimer.
     */
    void deactivate(Long id);

    /**
     * Compte le nombre total de patients actifs dans le système.
     */
    Long countActive();
}