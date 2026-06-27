package com.hospital.backend.controller;

import com.hospital.backend.entity.Role;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.security.HospitalTenantContext;
import com.hospital.backend.service.ActivityService; // Import du service
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/roles")
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
@Slf4j
public class RoleController {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActivityService activityService; // Injection pour le Dashboard

    // Récupérer tous les rôles (SUPERADMIN exclu — réservé aux développeurs)
    @GetMapping("/all")
    public List<Role> getAllRoles() {
        List<Role> roles = roleRepository.findAll().stream()
                .filter(r -> !"ROLE_SUPERADMIN".equals(r.getNom()) && !"SUPERADMIN".equals(r.getNom()))
                .toList();
        
        // MULTI-TENANT: filtrer par hôpital
        Long hospitalId = HospitalTenantContext.getHospitalId();
        
        for (Role role : roles) {
            long count;
            if (hospitalId != null) {
                count = userRepository.countByHospitalIdAndRole(hospitalId, role);
            } else {
                count = userRepository.countByRole(role);
            }
            role.setUtilisateursCount((int) count);
        }
        return roles;
    }

    // Créer un nouveau rôle + Log
    @PostMapping("/create")
    public ResponseEntity<?> createRole(@RequestBody Role role) {
        if (role.getNom() != null) {
            role.setNom(role.getNom().toUpperCase());
        }
        // 🛡️ BLOCAGE SÉCURITÉ : un admin hospitalier ne peut PAS créer de SUPERADMIN
        if ("SUPERADMIN".equals(role.getNom()) || "ROLE_SUPERADMIN".equals(role.getNom())) {
            log.warn("🚨 [SECURITE] Tentative de création du rôle SUPERADMIN bloquée par RoleController");
            return ResponseEntity.status(403).body(Map.of("error", "Ce rôle est réservé aux développeurs du système"));
        }
        Role savedRole = roleRepository.save(role);

        // Enregistrement de l'activité
        activityService.log("Nouveau Rôle", "Création du rôle " + savedRole.getNom(), "success");

        return ResponseEntity.ok(savedRole);
    }

    // Modifier un rôle + Log
    @PutMapping("/{id}")
    public ResponseEntity<?> updateRole(@PathVariable Long id, @RequestBody Role roleDetails) {
        String newNom = roleDetails.getNom() != null ? roleDetails.getNom().toUpperCase() : "";
        // 🛡️ BLOCAGE SÉCURITÉ
        if ("SUPERADMIN".equals(newNom) || "ROLE_SUPERADMIN".equals(newNom)) {
            log.warn("🚨 [SECURITE] Tentative de renommage vers SUPERADMIN bloquée par RoleController");
            return ResponseEntity.status(403).body(Map.of("error", "Ce rôle est réservé aux développeurs du système"));
        }
        return roleRepository.findById(id)
                .map(role -> {
                    role.setNom(newNom);
                    role.setDescription(roleDetails.getDescription());
                    role.setCouleur(roleDetails.getCouleur());
                    role.setPermissions(roleDetails.getPermissions());

                    Role updatedRole = roleRepository.save(role);
                    
                    // MULTI-TENANT: filtrer par hôpital
                    Long hospitalId = HospitalTenantContext.getHospitalId();
                    long count;
                    if (hospitalId != null) {
                        count = userRepository.countByHospitalIdAndRole(hospitalId, updatedRole);
                    } else {
                        count = userRepository.countByRole(updatedRole);
                    }
                    updatedRole.setUtilisateursCount((int) count);

                    // Enregistrement de l'activité
                    activityService.log("Modification", "Mise à jour du rôle " + updatedRole.getNom(), "info");

                    return ResponseEntity.ok(updatedRole);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Supprimer un rôle + Log
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRole(@PathVariable Long id) {
        return roleRepository.findById(id)
                .map(role -> {
                    // 🛡️ BLOCAGE SÉCURITÉ
                    if ("ROLE_SUPERADMIN".equals(role.getNom()) || "SUPERADMIN".equals(role.getNom())) {
                        log.warn("🚨 [SECURITE] Tentative de suppression du rôle SUPERADMIN bloquée");
                        return ResponseEntity.status(403).body(Map.of("error", "Ce rôle est réservé aux développeurs du système"));
                    }
                    String roleName = role.getNom();
                    roleRepository.delete(role);

                    // Enregistrement de l'activité
                    activityService.log("Suppression", "Le rôle " + roleName + " a été supprimé", "warning");

                    return ResponseEntity.ok().build();
                }).orElse(ResponseEntity.notFound().build());
    }
}