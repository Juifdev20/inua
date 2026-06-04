package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.service.SystemConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 🌐 PublicController — Endpoints accessibles sans authentification
 * Permet au frontend de vérifier le statut système (maintenance, santé)
 * avant même que l'utilisateur ne se connecte.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Public", description = "Endpoints publics — aucune authentification requise")
public class PublicController {

    private final SystemConfigService systemConfigService;

    /**
     * Retourne le statut maintenance + un message.
     * Appelé par le frontend toutes les 30s pour afficher une bannière.
     */
    @GetMapping("/system-status")
    @Operation(summary = "Statut public du système (maintenance)")
    public ResponseEntity<?> getSystemStatus() {
        boolean maintenance = systemConfigService.isMaintenanceMode();
        String message = maintenance
                ? "Inua Afya est momentanément en maintenance. Notre équipe travaille activement à résoudre cela. Merci de votre patience, nous serons de retour très bientôt."
                : "Système opérationnel.";

        Map<String, Object> data = new HashMap<>();
        data.put("maintenance", maintenance);
        data.put("message", message);
        data.put("timestamp", LocalDateTime.now().toString());

        return ResponseEntity.ok(ApiResponse.success("Statut système", data));
    }
}
