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
        return generateToken(user, jwtExpiration);
    }

    /**
     * ★ Génère un token avec une expiration personnalisée (en minutes)
     * Utilisé pour OAuth2 setup token
     */
    public String generateToken(String username, int expirationMinutes) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + (expirationMinutes * 60 * 1000L));

        return Jwts.builder()
                .subject(username)
                .claim("type", "setup")
                .claim("tokenVersion", 0L) // Setup token n'a pas besoin de version
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    /**
     * Génère un token JWT avec expiration personnalisée
     */
    private String generateToken(User user, long expirationMillis) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMillis);

        if (user.getRole() == null) {
            throw new RuntimeException("Utilisateur sans rôle — JWT impossible");
        }

        String roleName = user.getRole().getNom();

        return Jwts.builder()
                .subject(user.getUsername())
                .claim("id", user.getId())
                .claim("email", user.getEmail())
                .claim("role", roleName)
                .claim("firstName", user.getFirstName())
                .claim("lastName", user.getLastName())
                .claim("tokenVersion", user.getTokenVersion())
                .claim("hospitalId", user.getHospital() != null ? user.getHospital().getId() : null)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    // ======================= REFRESH TOKEN =======================
    public String generateRefreshToken(User user) {
        return generateRefreshToken(user.getUsername());
    }

    /**
     * ★ Génère un refresh token à partir du username uniquement
     * Utilisé pour OAuth2
     */
    public String generateRefreshToken(String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshExpiration);

        return Jwts.builder()
                .subject(username)
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

    public Long getHospitalIdFromToken(String token) {
        Object val = getClaims(token).get("hospitalId");
        if (val instanceof Number) return ((Number) val).longValue();
        return null;
    }

    public Long getTokenVersionFromToken(String token) {
        Object version = getClaims(token).get("tokenVersion");
        if (version instanceof Number) {
            return ((Number) version).longValue();
        }
        return 0L;
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
            // Ne pas logger si le token est vide ou null pour éviter de polluer la console
            if (token == null || token.trim().isEmpty()) {
                log.debug("[JWT] Token vide ou null");
                return false;
            }
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            // Logger en DEBUG seulement pour les tokens malformés, pas en ERROR
            log.debug("[JWT] Token invalide: {}", ex.getMessage());
            return false;
        }
    }

    public Long getAccessTokenExpiration() {
        return jwtExpiration;
    }

    /**
     * ★ Expose l'email contenu dans le claim "email" du token.
     * Utilisé par JwtService et l'AuditorAware.
     */
    public String getEmailFromToken(String token) {
        return getClaims(token).get("email", String.class);
    }

    /**
     * ★ Retourne la date d'expiration du token.
     * Utile pour le contrôle de session côté client.
     */
    public Date getExpirationDateFromToken(String token) {
        return getClaims(token).getExpiration();
    }

    /**
     * ★ Expose les claims bruts pour les services wrappers (JwtService).
     * Attention : usage interne / lecture seule.
     */
    public Claims extractClaims(String token) {
        return getClaims(token);
    }
}