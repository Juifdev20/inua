package com.hospital.backend.service;

import com.hospital.backend.entity.AuditLog;
import com.hospital.backend.repository.AuditLogRepository;
import com.hospital.backend.security.HospitalTenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository repository;

    // ═══════════════════════════════════════════════════
    // LECTURE DE BASE
    // ═══════════════════════════════════════════════════

    public List<AuditLog> getAllLogs() {
        Long hId = HospitalTenantContext.getHospitalId();
        if (hId != null) {
            return repository.findByHospitalIdOrderByDateDesc(hId);
        }
        return repository.findAllByOrderByDateDesc();
    }

    public Page<AuditLog> getAllLogsPaginated(int page, int size) {
        return repository.findAll(PageRequest.of(page, size,
                org.springframework.data.domain.Sort.by("date").descending()));
    }

    // ═══════════════════════════════════════════════════
    // ÉCRITURE
    // ═══════════════════════════════════════════════════

    // REQUIRES_NEW : l'écriture d'audit s'exécute dans SA PROPRE transaction.
    // Sinon, appelée depuis une méthode @Transactional(readOnly=true) (ex: consultation
    // de facturation patient), l'INSERT échoue et marque la transaction rollback-only
    // → UnexpectedRollbackException qui faisait échouer toute la requête (billing à 0).
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void logAction(String action, String utilisateur, String cible, String details, String type, String ip) {
        AuditLog log = AuditLog.builder()
                .action(action)
                .utilisateur(utilisateur)
                .cible(cible)
                .details(details)
                .type(type)
                .ip(ip)
                .date(LocalDateTime.now())
                .hospitalId(HospitalTenantContext.getHospitalId())
                .build();
        repository.save(log);
    }

    // ═══════════════════════════════════════════════════
    // FILTRAGE AVANCÉ (SUPERADMIN)
    // ═══════════════════════════════════════════════════

    public Page<AuditLog> searchLogs(String user, String action, String type, String cible,
                                      LocalDateTime start, LocalDateTime end, int page, int size) {
        Pageable pageable = PageRequest.of(page, size,
                org.springframework.data.domain.Sort.by("date").descending());

        boolean userNull = isEmpty(user);
        boolean actionNull = isEmpty(action);
        boolean typeNull = isEmpty(type);
        boolean cibleNull = isEmpty(cible);
        boolean startNull = (start == null);
        boolean endNull = (end == null);

        String userPattern = userNull ? "%%" : "%" + user.trim().toLowerCase() + "%";
        String actionPattern = actionNull ? "%%" : "%" + action.trim().toLowerCase() + "%";
        String typeLower = typeNull ? "" : type.trim().toLowerCase();
        String ciblePattern = cibleNull ? "%%" : "%" + cible.trim().toLowerCase() + "%";

        return repository.searchLogs(
                userNull, userPattern,
                actionNull, actionPattern,
                typeNull, typeLower,
                cibleNull, ciblePattern,
                startNull, start != null ? start : LocalDateTime.now(),
                endNull, end != null ? end : LocalDateTime.now(),
                pageable
        );
    }

    private boolean isEmpty(String s) {
        return s == null || s.trim().isEmpty();
    }

    // ═══════════════════════════════════════════════════
    // STATISTIQUES SÉCURITÉ
    // ═══════════════════════════════════════════════════

    public Map<String, Object> getSecurityStats() {
        Map<String, Object> stats = new HashMap<>();

        LocalDateTime last24h = LocalDateTime.now().minus(24, ChronoUnit.HOURS);
        LocalDateTime last7d = LocalDateTime.now().minus(7, ChronoUnit.DAYS);

        // Échecs de connexion récents
        long failedLogins24h = repository.countFailedLoginsSince(last24h);
        stats.put("failedLogins24h", failedLogins24h);

        // Utilisateurs avec trop d'échecs (brute force suspects)
        List<Object[]> bruteForceUsers = repository.findUsersWithFailedLoginsAboveThreshold(last24h, 5);
        stats.put("bruteForceSuspects", bruteForceUsers.size());

        // Accès aux données patients
        long patientAccess24h = repository.countPatientDataAccessSince(last24h);
        stats.put("patientDataAccess24h", patientAccess24h);

        long patientAccess7d = repository.countPatientDataAccessSince(last7d);
        stats.put("patientDataAccess7d", patientAccess7d);

        // Top utilisateurs accédant aux patients
        List<Object[]> topUsers = repository.findTopUsersAccessingPatientData(last24h);
        stats.put("topPatientDataUsers24h", topUsers.stream()
                .map(o -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("user", o[0]);
                    m.put("count", o[1]);
                    return m;
                })
                .toList());

        // Total logs période
        long totalLogs24h = repository.countAllSince(last24h);
        stats.put("totalLogs24h", totalLogs24h);

        return stats;
    }

    // ═══════════════════════════════════════════════════
    // ALERTES DE SÉCURITÉ
    // ═══════════════════════════════════════════════════

    public List<Map<String, String>> getActiveSecurityAlerts() {
        List<Map<String, String>> alerts = new java.util.ArrayList<>();
        LocalDateTime last10min = LocalDateTime.now().minus(10, ChronoUnit.MINUTES);
        LocalDateTime last1h = LocalDateTime.now().minus(1, ChronoUnit.HOURS);

        // Alerte 1 : brute force
        List<Object[]> bruteForce = repository.findUsersWithFailedLoginsAboveThreshold(last10min, 5);
        for (Object[] row : bruteForce) {
            Map<String, String> alert = new HashMap<>();
            alert.put("id", "BF-" + row[0]);
            alert.put("severity", "CRITICAL");
            alert.put("title", "Tentatives de connexion suspectes");
            alert.put("message", "L'utilisateur '" + row[0] + "' a " + row[1] + " échecs de connexion en 10 min.");
            alert.put("timestamp", LocalDateTime.now().toString());
            alerts.add(alert);
        }

        // Alerte 2 : volume anormal d'accès patient (plus de 100 en 1h)
        long heavyPatientAccess = repository.countPatientDataAccessSince(last1h);
        if (heavyPatientAccess > 100) {
            Map<String, String> alert = new HashMap<>();
            alert.put("id", "VOL-PATIENT");
            alert.put("severity", "WARNING");
            alert.put("title", "Volume d'accès patient anormal");
            alert.put("message", heavyPatientAccess + " accès aux données patients en 1 heure.");
            alert.put("timestamp", LocalDateTime.now().toString());
            alerts.add(alert);
        }

        log.debug("[AUDIT] {} alertes de sécurité actives", alerts.size());
        return alerts;
    }

    /**
     * 📊 Timeline des accès pour graphique (dernières 24h par défaut)
     */
    public List<Map<String, Object>> getTimeline(int hoursBack) {
        LocalDateTime since = LocalDateTime.now().minus(hoursBack, ChronoUnit.HOURS);
        List<Object[]> rows = repository.getTimelineSince(since);
        return rows.stream()
                .map(r -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("hour", r[0]);
                    m.put("count", r[1] != null ? ((Number) r[1]).intValue() : 0);
                    return m;
                })
                .toList();
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