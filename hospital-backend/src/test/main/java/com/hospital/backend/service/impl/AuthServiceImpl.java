package com.hospital.backend.service.impl;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.BadRequestException;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.security.JwtTokenProvider;
import com.hospital.backend.service.AuthService;
import com.hospital.backend.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PatientRepository patientRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final SimpMessagingTemplate messagingTemplate;
    private final AuditLogService auditLogService;

    @Override
    public LoginResponse login(LoginRequest request) {
        log.info("🔍 Tentative de connexion pour : {}", request.getUsername());
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            User user = userRepository.findByUsername(request.getUsername())
                    .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

            log.info("✅ [AUTH SUCCESS] User: {} | Role: {}", user.getUsername(), user.getRole().getNom());
            auditLogService.logAction("CONNEXION", user.getUsername(), "Auth", "Réussie", "success", "127.0.0.1");

            return LoginResponse.builder()
                    .accessToken(jwtTokenProvider.generateAccessToken(user))
                    .refreshToken(jwtTokenProvider.generateRefreshToken(user))
                    .tokenType("Bearer")
                    .expiresIn(jwtTokenProvider.getAccessTokenExpiration())
                    .user(mapToDTO(user))
                    .build();
        } catch (Exception e) {
            log.error("❌ Échec de connexion : {}", e.getMessage());
            throw e;
        }
    }

    @Override
    @Transactional
    public UserDTO register(RegisterRequest request) {
        log.info("📝 Inscription patient : {}", request.getUsername());

        if (userRepository.existsByUsername(request.getUsername())) throw new BadRequestException("Username déjà pris");
        if (userRepository.existsByEmail(request.getEmail())) throw new BadRequestException("Email déjà utilisé");

        // Recherche souple du rôle (PATIENT ou ROLE_PATIENT)
        Role userRole = roleRepository.findByNom("ROLE_PATIENT")
                .or(() -> roleRepository.findByNom("PATIENT"))
                .orElseThrow(() -> new ResourceNotFoundException("Rôle PATIENT non configuré dans la base de données"));

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phoneNumber(request.getPhoneNumber())
                .role(userRole)
                .isActive(true)
                .build();

        User savedUser = userRepository.save(user);

        // ✅ CORRECTION : Ajout de la liaison .user(savedUser)
        // C'est cette ligne qui remplit la colonne user_id en base de données
        Patient patient = Patient.builder()
                .user(savedUser)
                .firstName(savedUser.getFirstName())
                .lastName(savedUser.getLastName())
                .email(savedUser.getEmail())
                .phoneNumber(savedUser.getPhoneNumber())
                .patientCode("PAT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .isActive(true)
                .build();

        patientRepository.save(patient);
        log.info("✅ Profil Patient créé et lié à l'User ID: {}", savedUser.getId());

        return mapToDTO(savedUser);
    }

    @Transactional
    public UserDTO updateDoctor(Long id, UserDTO userDTO) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        user.setFirstName(userDTO.getFirstName());
        user.setLastName(userDTO.getLastName());
        user.setEmail(userDTO.getEmail());

        if (userDTO.getDepartment() != null) {
            Department dept = departmentRepository.findByNom(userDTO.getDepartment())
                    .orElseThrow(() -> new ResourceNotFoundException("Département non trouvé : " + userDTO.getDepartment()));
            user.setDepartment(dept);
            log.info("🏢 Département '{}' assigné au docteur {}", dept.getNom(), user.getUsername());
        }

        User updatedUser = userRepository.save(user);
        return mapToDTO(updatedUser);
    }

    @Override
    public LoginResponse refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) throw new BadRequestException("Token invalide");
        String username = jwtTokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        return LoginResponse.builder()
                .accessToken(jwtTokenProvider.generateAccessToken(user))
                .refreshToken(jwtTokenProvider.generateRefreshToken(user))
                .tokenType("Bearer")
                .user(mapToDTO(user))
                .build();
    }

    @Override
    public void logout(String token) { log.info("🚪 Déconnexion"); }

    private UserDTO mapToDTO(User user) {
        UserDTO dto = UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .photoUrl(user.getPhotoUrl())
                .bloodType(user.getBloodType())
                .address(user.getAddress())
                .dateOfBirth(user.getDateOfBirth())
                .department(user.getDepartment() != null ? user.getDepartment().getNom() : null)
                .role(user.getRole() != null ? user.getRole().getNom() : "ROLE_USER")
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();

        if (dto.getRole().contains("PATIENT")) {
            patientRepository.findByUser(user).ifPresent(patient -> {
                if (dto.getBloodType() == null || dto.getBloodType().isEmpty()) {
                    dto.setBloodType(patient.getBloodType());
                }
                if (dto.getAddress() == null || dto.getAddress().isEmpty()) {
                    dto.setAddress(patient.getAddress());
                }
                if ((dto.getDateOfBirth() == null || dto.getDateOfBirth().isEmpty()) && patient.getDateOfBirth() != null) {
                    dto.setDateOfBirth(patient.getDateOfBirth().toString());
                }
            });
        }

        return dto;
    }
}