package com.hospital.backend.service.impl;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.BadRequestException;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.security.JwtTokenProvider;
import com.hospital.backend.service.AuthService;
import com.hospital.backend.service.AuditLogService;
import com.hospital.backend.service.EmailService;
import com.hospital.backend.util.AccountGenerationUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
    private final EmailService emailService;
    private final HospitalRepository hospitalRepository;
    private final AccountGenerationUtils accountGenerationUtils;

    @Override
    public LoginResponse login(LoginRequest request) {
        log.info("🔍 Tentative de connexion pour : {}", request.getUsername());
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            // 🔧 PERMET de récupérer l'utilisateur même s'il s'est connecté avec son email
            User user = userRepository.findByUsername(request.getUsername())
                    .or(() -> userRepository.findByEmail(request.getUsername()))
                    .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

            // 🏥 Vérifier si l'hôpital est désactivé et si l'utilisateur est clinique
            if (user.getHospital() != null) {
                log.info("🏥 [AUTH CHECK] User: {} | Hospital: {} | Hospital Active: {}", 
                    user.getUsername(), 
                    user.getHospital().getNom(), 
                    user.getHospital().getIsActive());
                
                if (!Boolean.TRUE.equals(user.getHospital().getIsActive())) {
                    String roleName = user.getRole() != null ? user.getRole().getNom() : "";
                    log.info("🏥 [AUTH CHECK] User Role: {}", roleName);
                    
                    // Exclure les super admins du blocage
                    boolean isSuperAdmin = roleName.equals("ROLE_SUPER_ADMIN") ||
                            roleName.equals("SUPER_ADMIN");
                    
                    if (isSuperAdmin) {
                        log.info("🏥 [AUTH CHECK] Super Admin détecté, blocage ignoré");
                        // Ne pas bloquer les super admins
                    } else {
                        boolean isClinicalRole = roleName.equals("ROLE_DOCTOR") ||
                                roleName.equals("ROLE_DOCTEUR") ||
                                roleName.equals("DOCTOR") ||
                                roleName.equals("DOCTEUR") ||
                                roleName.equals("ROLE_LABO") ||
                                roleName.equals("ROLE_LABORATOIRE") ||
                                roleName.equals("LABO") ||
                                roleName.equals("LABORATOIRE") ||
                                roleName.equals("ROLE_PHARMACY") ||
                                roleName.equals("ROLE_PHARMACIE") ||
                                roleName.equals("PHARMACY") ||
                                roleName.equals("PHARMACIE") ||
                                roleName.equals("ROLE_PHARMACIST") ||
                                roleName.equals("PHARMACIST") ||
                                roleName.equals("ROLE_RECEPTION") ||
                                roleName.equals("RECEPTION") ||
                                roleName.equals("ROLE_FINANCE") ||
                                roleName.equals("FINANCE") ||
                                roleName.equals("ROLE_CAISSIER") ||
                                roleName.equals("CAISSIER");

                        log.info("🏥 [AUTH CHECK] Is Clinical Role: {}", isClinicalRole);

                        if (isClinicalRole) {
                            log.warn("🚫 [AUTH BLOCKED] Hôpital désactivé pour utilisateur clinique: {}", user.getUsername());
                            throw new BadRequestException("Accès suspendu. Le profil de votre établissement est temporairement désactivé. Veuillez contacter votre administrateur local ou le service client Inua Afya.");
                        }
                    }
                }
            }

            log.info("✅ [AUTH SUCCESS] User: {} | Role: {}", user.getUsername(), user.getRole().getNom());
            auditLogService.logAction("CONNEXION", user.getUsername(), "Auth", "Réussie", "success", "127.0.0.1");

            return LoginResponse.builder()
                    .accessToken(jwtTokenProvider.generateAccessToken(user))
                    .refreshToken(jwtTokenProvider.generateRefreshToken(user))
                    .tokenType("Bearer")
                    .expiresIn(jwtTokenProvider.getAccessTokenExpiration())
                    .mustChangePassword(user.getMustChangePassword() != null ? user.getMustChangePassword() : false)
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

        // Validation des doublons avec messages clairs pour le frontend
        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("⚠️ Tentative d'inscription avec username déjà pris: {}", request.getUsername());
            throw new BadRequestException("Ce nom d'utilisateur est déjà utilisé. Veuillez en choisir un autre.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("⚠️ Tentative d'inscription avec email déjà utilisé: {}", request.getEmail());
            throw new BadRequestException("Cet email est déjà associé à un compte. Veuillez utiliser un autre email.");
        }

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
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        User savedUser = userRepository.save(user);

        Patient patient = Patient.builder()
                .user(savedUser)
                .firstName(savedUser.getFirstName())
                .lastName(savedUser.getLastName())
                .email(savedUser.getEmail())
                .phoneNumber(savedUser.getPhoneNumber())
                .patientCode("PAT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .isActive(true)
                .build();

        // Lier l'hôpital si fourni dans la requête
        if (request.getHospitalId() != null) {
            hospitalRepository.findById(request.getHospitalId()).ifPresent(hospital -> {
                savedUser.setHospital(hospital);
                userRepository.save(savedUser);
                patient.setHospital(hospital);
            });
        }
        patientRepository.save(patient);
        log.info("✅ Profil Patient créé et lié à l'User ID: {}", savedUser.getId());

        return mapToDTO(savedUser);
    }

    // --- MÉTHODE CORRIGÉE (FIX NULL USERNAME) ---
    @Override
    @Transactional
    public UserDTO updateUser(Long id, UserDTO userDTO) {
        log.info("🔄 Mise à jour du profil pour l'ID : {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        // 1. PROTECTION USERNAME : Si le DTO envoie un username vide, on garde l'actuel
        if (userDTO.getUsername() != null && !userDTO.getUsername().trim().isEmpty()) {
            user.setUsername(userDTO.getUsername());
        } else {
            log.warn("⚠️ Username reçu vide pour ID {}, conservation du nom actuel : {}", id, user.getUsername());
            // On ne fait rien, user.getUsername() reste inchangé
        }

        // 2. Mise à jour des autres champs de base
        user.setFirstName(userDTO.getFirstName());
        user.setLastName(userDTO.getLastName());
        user.setEmail(userDTO.getEmail());
        user.setPhoneNumber(userDTO.getPhoneNumber());
        user.setUpdatedAt(LocalDateTime.now());

        // ✅ PRÉFÉRENCES
        if (userDTO.getNotificationEnabled() != null) user.setNotificationEnabled(userDTO.getNotificationEnabled());
        if (userDTO.getSoundEnabled() != null) user.setSoundEnabled(userDTO.getSoundEnabled());
        if (userDTO.getPreferredLanguage() != null) user.setPreferredLanguage(userDTO.getPreferredLanguage());

        // 3. Gestion du département pour les Docteurs
        if (userDTO.getDepartment() != null && !userDTO.getDepartment().isEmpty()) {
            departmentRepository.findByNom(userDTO.getDepartment()).ifPresent(dept -> {
                user.setDepartment(dept);
                log.info("🏢 Département mis à jour pour le docteur : {}", dept.getNom());
            });
        }

        // 4. Synchronisation avec la table Patient
        if (user.getRole() != null && user.getRole().getNom().contains("PATIENT")) {
            patientRepository.findByUser(user).ifPresent(p -> {
                p.setFirstName(user.getFirstName());
                p.setLastName(user.getLastName());
                p.setEmail(user.getEmail());
                p.setPhoneNumber(user.getPhoneNumber());
                patientRepository.save(p);
                log.info("📡 Table Patient synchronisée pour l'utilisateur {}", user.getUsername());
            });
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

    /**
     * ★ MOT DE PASSE OUBLIÉ - Initier la réinitialisation
     */
    @Override
    @Transactional
    public void initiatePasswordReset(String email) {
        log.info("🔑 Demande de réinitialisation pour: {}", email);

        // Chercher l'utilisateur par email
        var userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            // Pour des raisons de sécurité, ne pas révéler si l'email existe ou non
            log.warn("⚠️ Aucun utilisateur trouvé avec l'email: {}", email);
            return; // Silencieux
        }

        User user = userOpt.get();

        // Générer un token unique
        String resetToken = UUID.randomUUID().toString();
        user.setResetToken(resetToken);
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(10)); // ★ Sécurité: valide 10 minutes seulement
        userRepository.save(user);

        // Envoyer l'email de réinitialisation
        try {
            emailService.sendPasswordResetEmail(
                user.getEmail(),
                user.getFirstName(),
                resetToken
            );
            log.info("✅ Email de réinitialisation envoyé à: {}", email);
        } catch (Exception e) {
            log.error("❌ Erreur envoi email réinitialisation: {}", e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi de l'email");
        }
    }

    /**
     * ★ RÉINITIALISATION - Confirmer le nouveau mot de passe
     */
    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        log.info("🔑 Réinitialisation avec token");

        User user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Token invalide ou expiré"));

        // Vérifier si le token n'est pas expiré
        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Token expiré");
        }

        // Mettre à jour le mot de passe
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null); // Invalider le token
        user.setResetTokenExpiry(null);
        user.setMustChangePassword(false);
        userRepository.save(user);

        log.info("✅ Mot de passe réinitialisé pour: {}", user.getUsername());
    }

    /**
     * ★ VÉRIFIER SI UN EMAIL EXISTE DANS LA BASE DE DONNÉES
     */
    @Override
    public boolean checkEmailExists(String email) {
        if (email == null || email.isEmpty()) {
            return false;
        }
        return userRepository.findByEmail(email).isPresent();
    }

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
                .notificationEnabled(user.getNotificationEnabled())
                .soundEnabled(user.getSoundEnabled())
                .preferredLanguage(user.getPreferredLanguage())
                .mustChangePassword(user.getMustChangePassword())
                .hospitalId(user.getHospital() != null ? user.getHospital().getId() : null)
                .hospitalName(user.getHospital() != null ? user.getHospital().getNom() : null)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();

        if (dto.getRole().contains("PATIENT")) {
            patientRepository.findByUser(user).ifPresent(patient -> {
                // Ajouter le patientId pour le système IA
                dto.setPatientId(patient.getId());
                
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