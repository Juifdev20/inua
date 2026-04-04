package com.hospital.backend.controller;

import com.hospital.backend.dto.*;
import com.hospital.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification", description = "API d'authentification et gestion des tokens")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Connexion réussie", response));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDTO>> register(
            @Valid @RequestBody RegisterRequest request) {
        UserDTO user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Compte créé avec succès", user));
    }

    // --- NOUVELLE MÉTHODE AJOUTÉE POUR CORRIGER L'ERREUR UPDATE ---
    @PutMapping("/update/{id}")
    @Operation(summary = "Mettre à jour le profil utilisateur")
    public ResponseEntity<ApiResponse<UserDTO>> updateProfile(
            @PathVariable Long id,
            @RequestBody UserDTO request) {

        UserDTO updatedUser = authService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.success("Profil mis à jour avec succès", updatedUser));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(
            @RequestParam String refreshToken) {
        LoginResponse response = authService.refreshToken(refreshToken);
        return ResponseEntity.ok(ApiResponse.success("Token rafraîchi", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader("Authorization") String token) {
        authService.logout(token);
        return ResponseEntity.ok(ApiResponse.success("Déconnexion réussie", null));
    }
}