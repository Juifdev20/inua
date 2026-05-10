package com.hospital.backend.controller;

import com.hospital.backend.entity.ExchangeRate;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.service.ExchangeRateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ★ CONTROLLER: Gestion des taux de change (Admin)
 * Permet aux administrateurs de configurer les taux de conversion
 */
@RestController
@RequestMapping("/api/v1/admin/exchange-rates")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"https://inua-oux2.onrender.com", "https://inuaafia.onrender.com",
        "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;
    private final UserRepository userRepository;

    /**
     * ★ Récupère tous les taux actifs (Admin)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    public ResponseEntity<List<ExchangeRate>> getAllRates() {
        log.info("📊 Récupération de tous les taux de change");
        return ResponseEntity.ok(exchangeRateService.getAllActiveRates());
    }

    /**
     * ★ Récupère le taux actuel USD/FC
     */
    @GetMapping("/current")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    public ResponseEntity<Map<String, Object>> getCurrentRate() {
        BigDecimal rate = exchangeRateService.getUsdToFcRate();

        Map<String, Object> response = new HashMap<>();
        response.put("currencyFrom", "USD");
        response.put("currencyTo", "FC");
        response.put("rate", rate);
        response.put("formatted", "1 USD = " + rate + " FC");

        return ResponseEntity.ok(response);
    }

    /**
     * ★ Récupère un taux spécifique par ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    public ResponseEntity<ExchangeRate> getRateById(@PathVariable Long id) {
        return exchangeRateService.getRateById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * ★ Crée ou met à jour un taux de change
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ExchangeRate> createRate(@RequestBody ExchangeRate rate) {
        User currentUser = getCurrentUser();

        ExchangeRate saved = exchangeRateService.saveRate(
                rate,
                currentUser != null ? currentUser.getId() : null,
                currentUser != null ? (currentUser.getFirstName() + " " + currentUser.getLastName()) : "System"
        );

        return ResponseEntity.ok(saved);
    }

    /**
     * ★ Met à jour un taux existant
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ExchangeRate> updateRate(
            @PathVariable Long id,
            @RequestBody ExchangeRate rate) {
        User currentUser = getCurrentUser();

        // Vérifier que le taux existe
        if (!exchangeRateService.getRateById(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }

        rate.setId(id);
        ExchangeRate saved = exchangeRateService.saveRate(
                rate,
                currentUser != null ? currentUser.getId() : null,
                currentUser != null ? (currentUser.getFirstName() + " " + currentUser.getLastName()) : "System"
        );

        return ResponseEntity.ok(saved);
    }

    /**
     * ★ Désactive un taux (suppression logique)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteRate(@PathVariable Long id) {
        User currentUser = getCurrentUser();

        exchangeRateService.deactivateRate(
                id,
                currentUser != null ? currentUser.getId() : null,
                currentUser != null ? (currentUser.getFirstName() + " " + currentUser.getLastName()) : "System"
        );

        return ResponseEntity.ok().build();
    }

    /**
     * ★ Initialise le taux par défaut USD/FC
     */
    @PostMapping("/initialize")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> initializeDefaultRate() {
        User currentUser = getCurrentUser();

        exchangeRateService.initializeDefaultRate(
                currentUser != null ? currentUser.getId() : null,
                currentUser != null ? (currentUser.getFirstName() + " " + currentUser.getLastName()) : "System"
        );

        Map<String, String> response = new HashMap<>();
        response.put("message", "Taux par défaut initialisé avec succès");
        response.put("rate", "1 USD = 2800 FC");

        return ResponseEntity.ok(response);
    }

    /**
     * ★ Helper pour récupérer l'utilisateur courant
     */
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null) {
            return userRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }
}
