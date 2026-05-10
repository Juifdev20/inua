package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ★ RÉPONSE D'AUTHENTIFICATION GÉNÉRIQUE
 * Utilisée pour OAuth2, OTP (Magic Code), et autres méthodes d'authentification modernes
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;
    private UserDTO user;
}
