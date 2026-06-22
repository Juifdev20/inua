package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.entity.Role;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.service.AuditLogService;
import com.hospital.backend.service.DeviceSessionService;
import com.hospital.backend.service.EmailService;
import com.hospital.backend.service.SystemConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 🛡️ SuperAdminController - Panneau de contrôle complet du système
 *
 * Ce controller expose les fonctionnalités de gouvernance, d'audit
 * et de configuration réservées aux développeurs (ROLE_SUPERADMIN).
 *
 * Tous les endpoints sont protégés par ROLE_SUPERADMIN.
 * Aucun agent hospitalier (même ADMIN) n'y a accès.
 */
@RestController
@RequestMapping("/api/superadmin")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Super Admin", description = "Gouvernance et sécurité du système Inua Afya")
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class SuperAdminController {

    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SystemConfigService systemConfigService;
    private final DeviceSessionService deviceSessionService;
    private final com.hospital.backend.service.HospitalService hospitalService;
    private final com.hospital.backend.service.AdminCredentialsPdfService adminCredentialsPdfService;

    // ═══════════════════════════════════════════════════
    // 1. AUDIT & SÉCURITÉ
    // ═══════════════════════════════════════════════════

    @GetMapping("/audit/logs")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Logs d'audit filtrés et paginés")
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(required = false) String user,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String cible,
            @RequestParam(required = false) LocalDateTime start,
            @RequestParam(required = false) LocalDateTime end,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        try {
            Page<?> logs = auditLogService.searchLogs(user, action, type, cible, start, end, page, size);
            return ResponseEntity.ok(ApiResponse.success("Logs récupérés", logs));
        } catch (Exception e) {
            log.error("❌ [SuperAdmin] Erreur récupération logs: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur lors de la récupération des logs"));
        }
    }

    @GetMapping("/audit/stats")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Statistiques de sécurité temps réel")
    public ResponseEntity<?> getSecurityStats() {
        try {
            Map<String, Object> stats = auditLogService.getSecurityStats();
            return ResponseEntity.ok(ApiResponse.success("Stats sécurité", stats));
        } catch (Exception e) {
            log.error("❌ [SuperAdmin] Erreur stats: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur stats"));
        }
    }

    @GetMapping("/audit/alerts")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Alertes de sécurité actives")
    public ResponseEntity<?> getSecurityAlerts() {
        try {
            List<Map<String, String>> alerts = auditLogService.getActiveSecurityAlerts();
            return ResponseEntity.ok(ApiResponse.success("Alertes actives", alerts));
        } catch (Exception e) {
            log.error("❌ [SuperAdmin] Erreur alertes: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur alertes"));
        }
    }

    // ═══════════════════════════════════════════════════
    // 2. GESTION DES UTILISATEURS (IAM)
    // ═══════════════════════════════════════════════════

    @GetMapping("/users")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Liste complète des utilisateurs avec stats")
    public ResponseEntity<?> getAllUsers() {
        try {
            List<User> users = userRepository.findAll();
            List<Map<String, Object>> result = users.stream().map(u -> {
                Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", u.getId());
                map.put("username", u.getUsername());
                map.put("email", u.getEmail());
                map.put("firstName", u.getFirstName());
                map.put("lastName", u.getLastName());
                map.put("role", u.getRole() != null ? u.getRole().getNom() : "N/A");
                map.put("isActive", u.getIsActive());
                map.put("oauthProvider", u.getOauthProvider());
                map.put("mustChangePassword", Boolean.TRUE.equals(u.getMustChangePassword()));
                map.put("createdAt", u.getCreatedAt());
                return map;
            }).toList();
            return ResponseEntity.ok(ApiResponse.success("Utilisateurs", result));
        } catch (Exception e) {
            log.error("❌ [SuperAdmin] Erreur users: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur récupération users: " + e.getClass().getSimpleName()));
        }
    }

    @PostMapping("/users/{id}/toggle-active")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Activer / Désactiver un compte utilisateur")
    public ResponseEntity<?> toggleUserActive(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(ApiResponse.error("Utilisateur non trouvé"));
        }
        User user = userOpt.get();
        boolean activate = Boolean.parseBoolean(body.getOrDefault("activate", "false"));
        user.setIsActive(activate);
        userRepository.save(user);

        auditLogService.logAction(
                activate ? "USER_ACTIVATED" : "USER_DEACTIVATED",
                "SUPERADMIN",
                "USER-" + id,
                "Compte " + (activate ? "activé" : "désactivé") + " par SuperAdmin",
                "success",
                "127.0.0.1"
        );

        return ResponseEntity.ok(ApiResponse.success(
                "Compte " + (activate ? "activé" : "suspendu"),
                Map.of("userId", id, "isActive", activate)
        ));
    }

    @PostMapping("/users/{id}/reset-password")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Forcer la réinitialisation du mot de passe")
    public ResponseEntity<?> forcePasswordReset(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(ApiResponse.error("Utilisateur non trouvé"));
        }
        User user = userOpt.get();
        user.setMustChangePassword(true);
        userRepository.save(user);

        auditLogService.logAction(
                "FORCE_PASSWORD_RESET",
                "SUPERADMIN",
                "USER-" + id,
                "Réinitialisation forcée du mot de passe",
                "success",
                "127.0.0.1"
        );

        return ResponseEntity.ok(ApiResponse.success(
                "L'utilisateur devra changer son mot de passe au prochain login",
                Map.of("userId", id, "mustChangePassword", true)
        ));
    }

    // ═══════════════════════════════════════════════════
    // 3. CONFIGURATION SYSTÈME
    // ═══════════════════════════════════════════════════

    @GetMapping("/system/health")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "État de santé du système")
    public ResponseEntity<?> getSystemHealth() {
        Runtime runtime = Runtime.getRuntime();
        Map<String, Object> health = Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "javaVersion", System.getProperty("java.version"),
                "os", System.getProperty("os.name"),
                "memory", Map.of(
                        "totalMb", runtime.totalMemory() / 1024 / 1024,
                        "freeMb", runtime.freeMemory() / 1024 / 1024,
                        "usedMb", (runtime.totalMemory() - runtime.freeMemory()) / 1024 / 1024
                ),
                "processors", runtime.availableProcessors()
        );
        return ResponseEntity.ok(ApiResponse.success("Santé système", health));
    }

    // ═══════════════════════════════════════════════════
    // 4. TIMELINE — Graphique Recharts
    // ═══════════════════════════════════════════════════

    @GetMapping("/audit/timeline")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Timeline des accès pour graphique")
    public ResponseEntity<?> getTimeline(@RequestParam(defaultValue = "24") int hours) {
        try {
            List<Map<String, Object>> timeline = auditLogService.getTimeline(hours);
            return ResponseEntity.ok(ApiResponse.success("Timeline", timeline));
        } catch (Exception e) {
            log.error("❌ [SuperAdmin] Erreur timeline: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur timeline"));
        }
    }

    // ═══════════════════════════════════════════════════
    // 5. SESSIONS ACTIVES & FORCE LOGOUT
    // ═══════════════════════════════════════════════════

    @GetMapping("/sessions/active")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Sessions récentes (connexions des dernières 24h)")
    public ResponseEntity<?> getActiveSessions() {
        try {
            // Liste des connexions réussies depuis 24h via audit_logs
            List<Map<String, Object>> sessions = auditLogService.getAllLogs().stream()
                    .filter(l -> "CONNEXION".equals(l.getAction()) && "success".equalsIgnoreCase(l.getType()))
                    .filter(l -> l.getDate() != null && l.getDate().isAfter(LocalDateTime.now().minus(24, ChronoUnit.HOURS)))
                    .map(l -> Map.<String, Object>of(
                            "utilisateur", l.getUtilisateur(),
                            "ip", l.getIp(),
                            "date", l.getDate().toString(),
                            "details", l.getDetails()
                    ))
                    .toList();
            return ResponseEntity.ok(ApiResponse.success("Sessions actives", sessions));
        } catch (Exception e) {
            log.error("❌ [SuperAdmin] Erreur sessions: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur sessions"));
        }
    }

    @PostMapping("/users/{id}/force-logout")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Forcer la déconnexion d'un utilisateur (invalidation globale de ses tokens)")
    public ResponseEntity<?> forceLogout(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(ApiResponse.error("Utilisateur non trouvé"));
        }
        User user = userOpt.get();
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);

        auditLogService.logAction(
                "FORCE_LOGOUT",
                "SUPERADMIN",
                "USER-" + id,
                "Déconnexion forcée — tokenVersion incrémenté à " + user.getTokenVersion(),
                "success",
                "127.0.0.1"
        );

        return ResponseEntity.ok(ApiResponse.success(
                "L'utilisateur a été déconnecté de tous ses appareils",
                Map.of("userId", id, "tokenVersion", user.getTokenVersion())
        ));
    }

    // ═══════════════════════════════════════════════════
    // 6. MODE MAINTENANCE
    // ═══════════════════════════════════════════════════

    @GetMapping("/system/maintenance")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Statut du mode maintenance")
    public ResponseEntity<?> getMaintenanceStatus() {
        boolean active = systemConfigService.isMaintenanceMode();
        return ResponseEntity.ok(ApiResponse.success("Statut maintenance",
                Map.of("maintenance", active, "timestamp", LocalDateTime.now().toString())));
    }

    @PostMapping("/system/maintenance")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Activer / Désactiver le mode maintenance")
    public ResponseEntity<?> setMaintenanceStatus(@RequestBody Map<String, Object> body) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        String message = body.get("message") != null ? body.get("message").toString() : "";
        systemConfigService.setMaintenanceMode(enabled, message);

        auditLogService.logAction(
                enabled ? "MAINTENANCE_ON" : "MAINTENANCE_OFF",
                "SUPERADMIN",
                "SYSTEM",
                message.isEmpty() ? "Toggle mode maintenance" : message,
                "success",
                "127.0.0.1"
        );

        return ResponseEntity.ok(ApiResponse.success(
                enabled ? "Mode maintenance activé" : "Mode maintenance désactivé",
                Map.of("maintenance", enabled)
        ));
    }

    // ═══════════════════════════════════════════════════
    // 7. GESTION DES SUPER ADMINS (Développeurs)
    // ═══════════════════════════════════════════════════

    @GetMapping("/admins")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Liste des Super Admins existants")
    public ResponseEntity<?> getSuperAdmins() {
        try {
            Optional<Role> superRole = roleRepository.findByNom("ROLE_SUPERADMIN");
            if (superRole.isEmpty()) {
                return ResponseEntity.ok(ApiResponse.success("Aucun rôle SUPERADMIN trouvé", List.of()));
            }
            List<User> superAdmins = userRepository.findByRole(superRole.get());
            List<Map<String, Object>> result = superAdmins.stream().map(u -> Map.<String, Object>of(
                    "id", u.getId(),
                    "username", u.getUsername(),
                    "email", u.getEmail(),
                    "firstName", u.getFirstName(),
                    "lastName", u.getLastName(),
                    "isActive", u.getIsActive(),
                    "createdAt", u.getCreatedAt()
            )).toList();
            return ResponseEntity.ok(ApiResponse.success("Super Admins", result));
        } catch (Exception e) {
            log.error("❌ [SuperAdmin] Erreur liste admins: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur récupération Super Admins"));
        }
    }

    @PostMapping("/admins/{id}/promote")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Promouvoir un utilisateur existant en Super Admin")
    public ResponseEntity<?> promoteToSuperAdmin(@PathVariable Long id) {
        try {
            Optional<User> userOpt = userRepository.findById(id);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(ApiResponse.error("Utilisateur non trouvé"));
            }

            User user = userOpt.get();
            Optional<Role> superRole = roleRepository.findByNom("ROLE_SUPERADMIN");
            if (superRole.isEmpty()) {
                return ResponseEntity.status(500).body(ApiResponse.error("Rôle ROLE_SUPERADMIN non initialisé. Redémarrez le backend."));
            }

            // Vérifier s'il est déjà SUPERADMIN
            if (user.getRole() != null && "ROLE_SUPERADMIN".equals(user.getRole().getNom())) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Cet utilisateur est déjà Super Admin"));
            }

            user.setRole(superRole.get());
            userRepository.save(user);

            auditLogService.logAction(
                    "PROMOTE_SUPERADMIN",
                    "SUPERADMIN",
                    "USER-" + id,
                    "Promotion de " + user.getUsername() + " en Super Admin",
                    "success",
                    "127.0.0.1"
            );

            log.info("👑 [SuperAdmin] {} a été promu Super Admin par un développeur", user.getUsername());

            return ResponseEntity.ok(ApiResponse.success(
                    user.getUsername() + " est désormais Super Admin",
                    Map.of("userId", id, "username", user.getUsername(), "role", "ROLE_SUPERADMIN")
            ));
        } catch (Exception e) {
            log.error("❌ [SuperAdmin] Erreur promotion: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur promotion"));
        }
    }

    // ═══════════════════════════════════════════════════
    // 8. APPAREILS CONNECTÉS (Device Fingerprint)
    // ═══════════════════════════════════════════════════

    @GetMapping("/devices")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Liste des appareils connectés")
    public ResponseEntity<?> getAllDevices() {
        try {
            var devices = deviceSessionService.getAllDevices();
            return ResponseEntity.ok(ApiResponse.success("Appareils connectés", devices));
        } catch (Exception e) {
            log.error("❌ [SuperAdmin] Erreur devices: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur récupération appareils"));
        }
    }

    @PostMapping("/devices/{deviceId}/block")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Bloquer un appareil par son deviceId")
    public ResponseEntity<?> blockDevice(@PathVariable String deviceId, @RequestBody Map<String, String> body) {
        try {
            String reason = body != null ? body.getOrDefault("reason", "Bloqué par Super Admin") : "Bloqué par Super Admin";
            deviceSessionService.blockDevice(deviceId, reason);
            auditLogService.logAction(
                    "DEVICE_BLOCKED",
                    "SUPERADMIN",
                    "DEVICE-" + deviceId,
                    reason,
                    "success",
                    "127.0.0.1"
            );
            return ResponseEntity.ok(ApiResponse.success("Appareil bloqué", Map.of("deviceId", deviceId, "reason", reason)));
        } catch (Exception e) {
            log.error("❌ [SuperAdmin] Erreur blocage device: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur blocage appareil"));
        }
    }

    @PostMapping("/devices/{deviceId}/unblock")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Débloquer un appareil par son deviceId")
    public ResponseEntity<?> unblockDevice(@PathVariable String deviceId) {
        try {
            deviceSessionService.unblockDevice(deviceId);
            auditLogService.logAction(
                    "DEVICE_UNBLOCKED",
                    "SUPERADMIN",
                    "DEVICE-" + deviceId,
                    "Appareil débloqué",
                    "success",
                    "127.0.0.1"
            );
            return ResponseEntity.ok(ApiResponse.success("Appareil débloqué", Map.of("deviceId", deviceId)));
        } catch (Exception e) {
            log.error("❌ [SuperAdmin] Erreur déblocage device: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur déblocage appareil"));
        }
    }

    // ═══════════════════════════════════════════════════
    // 9. GESTION DES HOPITAUX (MULTI-TENANT)
    // ═══════════════════════════════════════════════════

    @GetMapping("/hospitals")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> getAllHospitals() {
        try {
            return ResponseEntity.ok(ApiResponse.success("Hopitaux", hospitalService.getAllHospitals()));
        } catch (Exception e) {
            log.error("[SuperAdmin] Erreur hopitaux: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur recuperation hopitaux"));
        }
    }

    @GetMapping("/hospitals/{id}")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> getHospital(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ApiResponse.success("Hopital", hospitalService.getHospitalById(id)));
        } catch (Exception e) {
            log.error("[SuperAdmin] Hopital {} introuvable: {}", id, e.getMessage());
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/hospitals")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> createHospital(@RequestBody com.hospital.backend.dto.HospitalDTO dto) {
        try {
            com.hospital.backend.dto.HospitalDTO created = hospitalService.createHospital(dto);
            auditLogService.logAction("HOSPITAL_CREATED", "SUPERADMIN", "HOSPITAL-" + created.getCode(), created.getNom(), "success", "127.0.0.1");
            return ResponseEntity.status(201).body(ApiResponse.success("Hopital cree", created));
        } catch (Exception e) {
            log.error("[SuperAdmin] Erreur creation hopital: {}", e.getMessage());
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/hospitals/{id}")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> updateHospital(@PathVariable Long id, @RequestBody com.hospital.backend.dto.HospitalDTO dto) {
        try {
            return ResponseEntity.ok(ApiResponse.success("Hopital modifie", hospitalService.updateHospital(id, dto)));
        } catch (Exception e) {
            log.error("[SuperAdmin] Erreur maj hopital {}: {}", id, e.getMessage());
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/hospitals/{id}/toggle")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> toggleHospital(@PathVariable Long id) {
        try {
            hospitalService.toggleHospitalStatus(id);
            auditLogService.logAction("HOSPITAL_TOGGLED", "SUPERADMIN", "HOSPITAL-" + id, "Statut modifie", "success", "127.0.0.1");
            return ResponseEntity.ok(ApiResponse.success("Statut modifie", null));
        } catch (Exception e) {
            log.error("[SuperAdmin] Erreur toggle hopital {}: {}", id, e.getMessage());
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/hospitals/{id}")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> deleteHospital(@PathVariable Long id) {
        try {
            hospitalService.deleteHospital(id);
            auditLogService.logAction("HOSPITAL_DELETED", "SUPERADMIN", "HOSPITAL-" + id, "Supprime", "success", "127.0.0.1");
            return ResponseEntity.ok(ApiResponse.success("Hopital supprime", null));
        } catch (Exception e) {
            log.error("[SuperAdmin] Erreur suppression hopital {}: {}", id, e.getMessage());
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage()));
        }
    }

    // ═══════════════════════════════════════════════════
    // 10. PROVISION ADMIN POUR UN HÔPITAL
    // ═══════════════════════════════════════════════════

    @PostMapping("/hospitals/{id}/provision-admin")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Operation(summary = "Créer un compte ADMIN pour un hôpital")
    public ResponseEntity<?> provisionAdmin(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            com.hospital.backend.entity.Hospital hospital = hospitalService.getEntityById(id);
            String email = body.get("email");
            String firstName = body.getOrDefault("firstName", "Admin");
            String lastName = body.getOrDefault("lastName", hospital.getNom());

            if (email == null || email.isBlank()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Email obligatoire"));
            }
            if (userRepository.existsByEmail(email)) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Email déjà utilisé"));
            }

            String tempPassword = java.util.UUID.randomUUID().toString().substring(0, 10);

            Role adminRole = roleRepository.findByNom("ROLE_ADMIN")
                    .orElseThrow(() -> new RuntimeException("Role ROLE_ADMIN non trouvé"));

            User admin = User.builder()
                    .username(email)
                    .email(email)
                    .firstName(firstName)
                    .lastName(lastName)
                    .password(passwordEncoder.encode(tempPassword))
                    .role(adminRole)
                    .hospital(hospital)
                    .isActive(true)
                    .mustChangePassword(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            User saved = userRepository.save(admin);

            // Generation PDF credentials
            byte[] pdfBytes = adminCredentialsPdfService.generate(saved, tempPassword, hospital);
            String pdfBase64 = adminCredentialsPdfService.toBase64(pdfBytes);

            emailService.sendCredentialsEmail(
                    email, firstName, lastName, email, tempPassword, "ADMIN"
            );

            auditLogService.logAction("ADMIN_PROVISIONED", "SUPERADMIN",
                    "HOSPITAL-" + id, "Admin " + email + " pour " + hospital.getNom(), "success", "127.0.0.1");

            log.info("[SuperAdmin] Admin provisionne pour {}: {}", hospital.getNom(), email);
            return ResponseEntity.status(201).body(ApiResponse.success(
                    "Admin cree pour " + hospital.getNom(),
                    Map.of("id", saved.getId(), "email", email, "hospital", hospital.getNom(),
                            "pdfBase64", pdfBase64, "filename", "credentials_" + saved.getId() + ".pdf")));

        } catch (Exception e) {
            log.error("[SuperAdmin] Erreur provision admin: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur: " + e.getMessage()));
        }
    }

}
