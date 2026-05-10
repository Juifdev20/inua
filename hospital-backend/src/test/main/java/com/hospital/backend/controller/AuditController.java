package com.hospital.backend.controller;

import com.hospital.backend.entity.AuditLog;
import com.hospital.backend.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class AuditController {

    private final AuditLogService auditLogService;

    // 1. Récupérer tous les logs
    @GetMapping("/logs")
    public ResponseEntity<List<AuditLog>> getAllLogs() {
        return ResponseEntity.ok(auditLogService.getAllLogs());
    }

    // 2. Récupérer les statistiques pour les cartes (Total, Succès, Erreurs, etc.)
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        List<AuditLog> logs = auditLogService.getAllLogs();
        Map<String, Long> stats = new HashMap<>();

        stats.put("total", (long) logs.size());
        stats.put("success", logs.stream().filter(l -> "success".equalsIgnoreCase(l.getType())).count());
        stats.put("warning", logs.stream().filter(l -> "warning".equalsIgnoreCase(l.getType())).count());
        stats.put("error", logs.stream().filter(l -> "error".equalsIgnoreCase(l.getType())).count());

        return ResponseEntity.ok(stats);
    }

    // 3. Endpoint pour l'exportation réelle en CSV
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportLogs() {
        // Récupération des données CSV via le service
        String csvData = auditLogService.exportLogsToCSV();

        // Conversion en bytes avec support des caractères spéciaux (UTF-8)
        byte[] csvBytes = csvData.getBytes(StandardCharsets.UTF_8);

        // Génération d'un nom de fichier dynamique avec la date actuelle
        String fileName = "audit_report_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmm")) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .contentLength(csvBytes.length)
                .body(csvBytes);
    }

    @DeleteMapping("/clear")
    public ResponseEntity<Void> clearLogs() {
        // Optionnel: ajouter une méthode deleteAll dans le service si nécessaire
        return ResponseEntity.noContent().build();
    }
}