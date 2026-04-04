package com.hospital.backend.security;

import com.hospital.backend.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
@Slf4j
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private Long jwtExpiration;

    @Value("${jwt.refresh-expiration}")
    private Long refreshExpiration;

    private SecretKey key;

    @PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    // ======================= ACCESS TOKEN =======================
    public String generateAccessToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        if (user.getRole() == null) {
            throw new RuntimeException("Utilisateur sans rôle — JWT impossible");
        }

        // CORRECTED: On extrait le NOM du rôle et non l'objet complet
        // Assure-toi que la méthode dans ton entité Role s'appelle bien getNom()
        String roleName = user.getRole().getNom();

        return Jwts.builder()
                .subject(user.getUsername())
                .claim("id", user.getId())
                .claim("email", user.getEmail())
                .claim("role", roleName) // Stockera "ADMIN"
                .claim("firstName", user.getFirstName())
                .claim("lastName", user.getLastName())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    // ======================= REFRESH TOKEN =======================
    public String generateRefreshToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshExpiration);

        return Jwts.builder()
                .subject(user.getUsername())
                .claim("type", "refresh")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    // ======================= PARSING =======================
    public String getUsernameFromToken(String token) {
        return getClaims(token).getSubject();
    }

    public Long getUserIdFromToken(String token) {
        return getClaims(token).get("id", Long.class);
    }

    public String getRoleFromToken(String token) {
        return getClaims(token).get("role", String.class);
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // ======================= VALIDATION =======================
    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            log.error("JWT invalide: {}", ex.getMessage());
            return false;
        }
    }

    public Long getAccessTokenExpiration() {
        return jwtExpiration;
    }
}