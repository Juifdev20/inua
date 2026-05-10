package com.hospital.backend.service;

import com.hospital.backend.dto.UserDTO;
import com.hospital.backend.dto.PageResponse;
import org.springframework.data.domain.Pageable;
import java.util.List;
import com.hospital.backend.entity.Role;

/**
 * Service gérant la logique métier des utilisateurs.
 * Supporte désormais la gestion multi-rôles (ADMIN, DOCTOR, RECEPTION, FINANCE, etc.)
 */
public interface UserService {

    // --- Lecture et Recherche ---
    UserDTO getById(Long id);
    UserDTO getByUsername(String username);
    PageResponse<UserDTO> getAll(Pageable pageable);
    PageResponse<UserDTO> getByRole(Role role, Pageable pageable);
    PageResponse<UserDTO> search(String query, Pageable pageable);
    List<UserDTO> getActiveByRole(Role role);

    // --- Mises à jour Profil ---
    UserDTO update(Long id, UserDTO userDTO);
    UserDTO updatePhoto(Long id, String photoUrl);
    UserDTO updatePassword(Long id, String oldPassword, String newPassword);

    // --- Gestion du Statut ---
    void deactivate(Long id);
    void activate(Long id);
    void delete(Long id);

    /**
     * Change le rôle d'un utilisateur (ex: de PATIENT à DOCTOR).
     * @param id L'identifiant de l'utilisateur
     * @param newRoleName Le nom du rôle (ex: "DOCTOR", "ROLE_RECEPTION", "FINANCE")
     * @return L'utilisateur mis à jour en format DTO
     */
    UserDTO updateRole(Long id, String newRoleName);
}