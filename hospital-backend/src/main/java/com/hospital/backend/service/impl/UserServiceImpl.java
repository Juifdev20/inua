package com.hospital.backend.service.impl;

import com.hospital.backend.dto.UserDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.entity.Role;
import com.hospital.backend.entity.User;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.service.UserService;
import com.hospital.backend.security.HospitalTenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    // ✅ Doit correspondre à l'interface (deleteUser existe dans votre interface)
    @Override
    @Transactional
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    // ✅ Requis par ExpenseServiceImpl
    @Override
    @Transactional(readOnly = true)
    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserDTO> getUsersByRole(String roleName) {
        Role role = roleRepository.findByNom(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Rôle non trouvé: " + roleName));
        Long hId = HospitalTenantContext.getHospitalId();
        List<User> users;
        if (hId != null) {
            users = userRepository.findByHospitalIdAndRoleAndIsActiveTrue(hId, role);
        } else {
            users = userRepository.findByRoleAndIsActiveTrue(role);
        }
        return users.stream()
                .map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToDTO).collect(Collectors.toList());
    }

    // ✅ Dans votre interface c'est getUserById (pas getById)
    @Override
    @Transactional(readOnly = true)
    public UserDTO getUserById(Long id) {
        return userRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public UserDTO getByUsername(String username) {
        return userRepository.findByUsername(username)
                .map(this::mapToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    // --- Méthodes de pagination ---

    @Override
    public PageResponse<UserDTO> getAll(Pageable pageable) {
        throw new UnsupportedOperationException("Non implémenté");
    }

    @Override
    public PageResponse<UserDTO> getByRole(Role role, Pageable pageable) {
        throw new UnsupportedOperationException("Non implémenté");
    }

    @Override
    public PageResponse<UserDTO> search(String query, Pageable pageable) {
        throw new UnsupportedOperationException("Non implémenté");
    }

    @Override
    public List<UserDTO> getActiveByRole(Role role) {
        return userRepository.findByRoleAndIsActiveTrue(role).stream()
                .map(this::mapToDTO).collect(Collectors.toList());
    }

    // --- Actions ---

    @Override
    @Transactional
    public UserDTO update(Long id, UserDTO userDTO) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (userDTO.getFirstName() != null) user.setFirstName(userDTO.getFirstName());
        if (userDTO.getLastName() != null) user.setLastName(userDTO.getLastName());
        if (userDTO.getPhoneNumber() != null) user.setPhoneNumber(userDTO.getPhoneNumber());
        if (userDTO.getEmail() != null) user.setEmail(userDTO.getEmail());
        if (userDTO.getAddress() != null) user.setAddress(userDTO.getAddress());
        if (userDTO.getBloodType() != null) user.setBloodType(userDTO.getBloodType());
        if (userDTO.getDateOfBirth() != null) user.setDateOfBirth(userDTO.getDateOfBirth());

        // ✅ PRÉFÉRENCES
        if (userDTO.getNotificationEnabled() != null) user.setNotificationEnabled(userDTO.getNotificationEnabled());
        if (userDTO.getSoundEnabled() != null) user.setSoundEnabled(userDTO.getSoundEnabled());
        if (userDTO.getPreferredLanguage() != null) user.setPreferredLanguage(userDTO.getPreferredLanguage());

        User saved = userRepository.save(user);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public UserDTO updatePhoto(Long id, String photoUrl) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setPhotoUrl(photoUrl);
        User saved = userRepository.save(user);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public UserDTO updatePassword(Long id, String oldPassword, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        // Verify old password
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new IllegalArgumentException("Ancien mot de passe incorrect");
        }

        // Encode and set new password
        user.setPassword(passwordEncoder.encode(newPassword));
        User saved = userRepository.save(user);
        return mapToDTO(saved);
    }
    @Override public void deactivate(Long id) { /* Logique is_active = false */ }
    @Override public void activate(Long id) { /* Logique is_active = true */ }

    // ✅ Doit correspondre à l'interface
    @Override public void delete(Long id) { userRepository.deleteById(id); }

    @Override public UserDTO updateRole(Long id, String newRoleName) { return null; }

    // --- Helper ---
    private UserDTO mapToDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .username(user.getUsername())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .photoUrl(user.getPhotoUrl())
                .address(user.getAddress())
                .bloodType(user.getBloodType())
                .dateOfBirth(user.getDateOfBirth())
                .roleName(user.getRole() != null ? user.getRole().getNom() : null)
                .isActive(user.getIsActive())
                .notificationEnabled(user.getNotificationEnabled())
                .soundEnabled(user.getSoundEnabled())
                .preferredLanguage(user.getPreferredLanguage())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}