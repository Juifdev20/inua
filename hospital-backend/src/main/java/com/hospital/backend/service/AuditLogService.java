package com.hospital.backend.service;

import com.hospital.backend.entity.AuditLog;
import com.hospital.backend.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository repository;

    /**
     * Récupère tous les logs triés par date décroissante.
     */
    public List<AuditLog> getAllLogs() {
        return repository.findAllByOrderByDateDesc();
    }

    /**
     * Enregistre une nouvelle action dans les logs d'audit.
     */
    public void logAction(String action, String utilisateur, String cible, String details, String type, String ip) {
        AuditLog log = AuditLog.builder()
                .action(action)
                .utilisateur(utilisateur)
                .cible(cible)
                .details(details)
                .type(type)
                .ip(ip)
                .date(LocalDateTime.now())
                .build();
        repository.save(log);
    }

    /**
     * Génère une chaîne de caractères au format CSV à partir de tous les logs.
     * Corrigé pour Excel (BOM UTF-8 et Format Date).
     */
    public String exportLogsToCSV() {
        List<AuditLog> logs = repository.findAllByOrderByDateDesc();
        StringBuilder csv = new StringBuilder();

        // 1. AJOUT DU BOM UTF-8 (Indispensable pour Excel et les accents)
        csv.append('\ufeff');

        // 2. En-têtes (Point-virgule pour Excel FR)
        csv.append("ID;Date;Action;Utilisateur;Cible;Type;IP;Details\n");

        // 3. Format de date standard (Jour/Mois/Année) pour éviter les ######
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

        for (AuditLog log : logs) {
            csv.append(log.getId()).append(";")
                    .append(log.getDate() != null ? log.getDate().format(formatter) : "").append(";")
                    .append(cleanField(log.getAction())).append(";")
                    .append(cleanField(log.getUtilisateur())).append(";")
                    .append(cleanField(log.getCible())).append(";")
                    .append(cleanField(log.getType())).append(";")
                    .append(cleanField(log.getIp())).append(";")
                    .append(cleanField(log.getDetails()))
                    .append("\n");
        }

        return csv.toString();
    }

    /**
     * Nettoie les champs pour éviter de casser le format CSV.
     */
    private String cleanField(String field) {
        if (field == null) return "";
        // Remplace les points-virgules par des virgules et supprime les retours à la ligne
        return field.replace(";", ",").replace("\n", " ").replace("\r", "").trim();
    }
}