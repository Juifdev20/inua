package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.dto.UserDTO;
import com.hospital.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/users", "/api/v1/users", "/users"})
@RequiredArgsConstructor
@Tag(name = "Utilisateurs", description = "Gestion des comptes du personnel")
public class UserController {

    private final UserService userService;

    /**
     * ✅ CORRIGÉ : ROLE_FINANCE ajouté pour la caisse
     */
    @GetMapping(value = "/doctors", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION', 'ROLE_DOCTEUR', 'ROLE_FINANCE', 'ROLE_PATIENT', 'ROLE_LABORATOIRE', 'ROLE_LAB')")
    @Operation(summary = "Lister les médecins", description = "Récupère uniquement les utilisateurs avec le rôle DOCTEUR")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllDoctors() {
        List<UserDTO> doctors = userService.getUsersByRole("ROLE_DOCTEUR");
        return ResponseEntity.ok(ApiResponse.success(doctors));
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Lister tous les utilisateurs")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers() {
        List<UserDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_RECEPTION')")
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(@PathVariable Long id) {
        UserDTO user = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success("Utilisateur supprimé", null));
    }
}