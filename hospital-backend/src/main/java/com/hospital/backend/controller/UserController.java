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
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

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

    private final String UPLOAD_DIR = "uploads/avatars/";

    @GetMapping(value = "/me", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Récupérer le profil de l'utilisateur connecté")
    public ResponseEntity<ApiResponse<UserDTO>> getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        UserDTO user = userService.getByUsername(username);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PutMapping(value = "/me", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mettre à jour le profil de l'utilisateur connecté")
    public ResponseEntity<ApiResponse<UserDTO>> updateCurrentUser(
            Authentication authentication,
            @RequestBody UserDTO userDTO) {
        String username = authentication.getName();
        UserDTO currentUser = userService.getByUsername(username);
        UserDTO updated = userService.update(currentUser.getId(), userDTO);
        return ResponseEntity.ok(ApiResponse.success("Profil mis à jour", updated));
    }

    @PutMapping(value = "/me/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mettre à jour la photo de profil")
    public ResponseEntity<ApiResponse<UserDTO>> updatePhoto(
            Authentication authentication,
            @RequestParam("photo") MultipartFile photo) throws IOException {

        if (photo == null || photo.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Aucune photo fournie"));
        }

        String username = authentication.getName();
        UserDTO currentUser = userService.getByUsername(username);

        File directory = new File(UPLOAD_DIR);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        String fileName = "avatar_" + currentUser.getId() + "_" + System.currentTimeMillis() + "_" + photo.getOriginalFilename();
        Path path = Paths.get(UPLOAD_DIR + fileName);
        Files.write(path, photo.getBytes());

        String photoUrl = "/uploads/avatars/" + fileName;
        UserDTO updated = userService.updatePhoto(currentUser.getId(), photoUrl);

        return ResponseEntity.ok(ApiResponse.success("Photo de profil mise à jour", updated));
    }

    @PutMapping(value = "/me/password", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Changer le mot de passe")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            Authentication authentication,
            @RequestBody Map<String, String> passwordData) {

        String oldPassword = passwordData.get("oldPassword");
        String newPassword = passwordData.get("newPassword");

        if (oldPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Ancien et nouveau mot de passe requis"));
        }

        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Le nouveau mot de passe doit faire au moins 6 caractères"));
        }

        String username = authentication.getName();
        UserDTO currentUser = userService.getByUsername(username);

        try {
            userService.updatePassword(currentUser.getId(), oldPassword, newPassword);
            return ResponseEntity.ok(ApiResponse.success("Mot de passe changé avec succès", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}