package com.hospital.backend.service;

import com.hospital.backend.dto.UserDTO;
import com.hospital.backend.entity.User;
import com.hospital.backend.dto.PageResponse;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;
import com.hospital.backend.entity.Role;

/**
 * Service gérant la logique métier des utilisateurs.
 */
public interface UserService {
    void deleteUser(Long id);

    // --- Méthodes requises par ExpenseServiceImpl ---
    User findById(Long id);

    // --- Méthodes existantes ---
    List<UserDTO> getUsersByRole(String roleName);
    List<UserDTO> getAllUsers();
    UserDTO getUserById(Long id);
    PageResponse<UserDTO> getAll(Pageable pageable);
    PageResponse<UserDTO> getByRole(Role role, Pageable pageable);
    PageResponse<UserDTO> search(String query, Pageable pageable);
    List<UserDTO> getActiveByRole(Role role);

    UserDTO update(Long id, UserDTO userDTO);
    UserDTO updatePhoto(Long id, String photoUrl);
    UserDTO updatePassword(Long id, String oldPassword, String newPassword);

    void deactivate(Long id);
    void activate(Long id);
    void delete(Long id);
    UserDTO updateRole(Long id, String newRoleName);
    
UserDTO getByUsername(String username);
}
