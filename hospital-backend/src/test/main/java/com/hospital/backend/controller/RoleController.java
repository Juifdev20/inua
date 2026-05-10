package com.hospital.backend.controller;

import com.hospital.backend.entity.Role;
import com.hospital.backend.repository.RoleRepository;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.service.ActivityService; // Import du service
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/roles")
@CrossOrigin(origins = "*")
public class RoleController {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActivityService activityService; // Injection pour le Dashboard

    // Récupérer tous les rôles
    @GetMapping("/all")
    public List<Role> getAllRoles() {
        List<Role> roles = roleRepository.findAll();
        for (Role role : roles) {
            long count = userRepository.countByRole(role);
            role.setUtilisateursCount((int) count);
        }
        return roles;
    }

    // Créer un nouveau rôle + Log
    @PostMapping("/create")
    public Role createRole(@RequestBody Role role) {
        if (role.getNom() != null) {
            role.setNom(role.getNom().toUpperCase());
        }
        Role savedRole = roleRepository.save(role);

        // Enregistrement de l'activité
        activityService.log("Nouveau Rôle", "Création du rôle " + savedRole.getNom(), "success");

        return savedRole;
    }

    // Modifier un rôle + Log
    @PutMapping("/{id}")
    public ResponseEntity<Role> updateRole(@PathVariable Long id, @RequestBody Role roleDetails) {
        return roleRepository.findById(id)
                .map(role -> {
                    role.setNom(roleDetails.getNom().toUpperCase());
                    role.setDescription(roleDetails.getDescription());
                    role.setCouleur(roleDetails.getCouleur());
                    role.setPermissions(roleDetails.getPermissions());

                    Role updatedRole = roleRepository.save(role);
                    updatedRole.setUtilisateursCount((int) userRepository.countByRole(updatedRole));

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
                    String roleName = role.getNom();
                    roleRepository.delete(role);

                    // Enregistrement de l'activité
                    activityService.log("Suppression", "Le rôle " + roleName + " a été supprimé", "warning");

                    return ResponseEntity.ok().build();
                }).orElse(ResponseEntity.notFound().build());
    }
}