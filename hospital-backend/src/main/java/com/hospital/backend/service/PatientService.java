package com.hospital.backend.service;

import com.hospital.backend.dto.PatientDTO;
import com.hospital.backend.dto.PatientSimpleDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.dto.ChangePasswordRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Interface de service pour la gestion des patients.
 * Inclut les méthodes de manipulation de données, de recherche et de sécurité.
 * ✅ ADAPTATION : Support complet du Triage, de l'archivage et du stockage photo.
 */
public interface PatientService {

    /**
     * ✅ CRÉATION (MULTIPART) : Crée un nouveau dossier patient avec photo.
     */
    PatientDTO create(PatientDTO patientDTO, MultipartFile photo);

    /**
     * ✅ CRÉATION (JSON) : Crée un nouveau dossier patient sans photo.
     */
    PatientDTO create(PatientDTO patientDTO);

    /**
     * ✅ MISE À JOUR (MULTIPART) : Met à jour un patient via son ID avec photo optionnelle.
     * Utilisé principalement pour la modification complète du profil.
     */
    PatientDTO update(Long id, PatientDTO patientDTO, MultipartFile photo);

    /**
     * ✅ MISE À JOUR (JSON / TRIAGE) : Met à jour les données vitales ou administratives.
     * Utilisé pour valider l'admission et le triage sans manipuler de fichiers.
     */
    PatientDTO update(Long id, PatientDTO patientDTO);

    /**
     * Met à jour le dossier du patient via son email (Profil "Me").
     */
    PatientDTO updateByEmail(String email, PatientDTO patientDTO);

    /**
     * ✅ SÉCURITÉ : Met à jour le mot de passe de l'utilisateur lié au patient.
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
     * Liste tous les patients ACTIFS avec pagination.
     */
    PageResponse<PatientDTO> getAll(Pageable pageable);

    /**
     * ✅ NOUVEAU : Récupère la liste complète des patients ACTIFS sans pagination.
     */
    List<PatientDTO> getAllList();

    /**
     * ✅ OPTIMISATION RÉCEPTION : Récupère la liste simplifiée (ID + FullName).
     */
    List<PatientSimpleDTO> getAllSimpleList();

    /**
     * ✅ OPTIMISATION RÉCEPTION : Recherche rapide simplifiée (ID + FullName).
     */
    List<PatientSimpleDTO> searchSimple(String query);

    /**
     * Recherche des patients ACTIFS par nom, téléphone ou code.
     */
    PageResponse<PatientDTO> search(String query, Pageable pageable);

    /**
     * Supprime définitivement un dossier patient de la base de données.
     * ⚠️ Action irréversible réservée uniquement au rôle ADMIN.
     */
    void delete(Long id);

    /**
     * ✅ ARCHIVAGE : Désactive un dossier patient sans le supprimer (Soft Delete).
     */
    void deactivate(Long id);

    /**
     * ✅ RESTAURATION : Réactive un dossier patient précédemment archivé.
     */
    void activate(Long id);

    /**
     * ✅ VUE ARCHIVES : Liste uniquement les patients désactivés.
     */
    PageResponse<PatientDTO> getAllArchived(Pageable pageable);

    /**
     * Compte le nombre total de patients actifs dans le système.
     */
    Long countActive();

    /**
     * ✅ NETTOYAGE : Supprime tous les patients et leurs comptes utilisateurs
     * qui n'ont pas de photo enregistrée (Maintenance du stockage).
     */
    void deleteAllWithoutPhotos();
}