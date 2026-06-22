package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.entity.BackupHistory;
import com.hospital.backend.repository.BackupHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/superadmin/backup")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000"})
public class BackupController {

    private final BackupHistoryRepository backupHistoryRepository;

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    @Value("${backup.directory:./backups}")
    private String backupDirectory;

    @GetMapping("/history")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> getHistory() {
        try {
            List<BackupHistory> history = backupHistoryRepository.findAllByOrderByCreatedAtDesc();
            return ResponseEntity.ok(ApiResponse.success("Historique backups", history));
        } catch (Exception e) {
            log.error("[Backup] Erreur historique: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur historique"));
        }
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> getStats() {
        try {
            Map<String, Object> stats = new LinkedHashMap<>();
            stats.put("total",     backupHistoryRepository.count());
            stats.put("success",   backupHistoryRepository.countByStatus("SUCCESS"));
            stats.put("failed",    backupHistoryRepository.countByStatus("FAILED"));
            stats.put("inProgress", backupHistoryRepository.countByStatus("IN_PROGRESS"));

            // Disk info for backup directory
            File dir = new File(backupDirectory);
            if (dir.exists()) {
                stats.put("diskFreeGB",  Math.round(dir.getFreeSpace()  / 1024.0 / 1024 / 1024 * 10) / 10.0);
                stats.put("diskTotalGB", Math.round(dir.getTotalSpace() / 1024.0 / 1024 / 1024 * 10) / 10.0);
            }

            List<BackupHistory> recent = backupHistoryRepository.findTop10ByOrderByCreatedAtDesc();
            stats.put("lastBackup", recent.isEmpty() ? null : recent.get(0).getCreatedAt());
            return ResponseEntity.ok(ApiResponse.success("Stats backup", stats));
        } catch (Exception e) {
            log.error("[Backup] Erreur stats: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur stats"));
        }
    }

    @PostMapping("/trigger")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> triggerBackup(Authentication auth) {
        String triggeredBy = auth != null ? auth.getName() : "SUPERADMIN";
        String timestamp   = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename    = "backup_" + timestamp + ".sql";

        BackupHistory record = BackupHistory.builder()
                .filename(filename)
                .filePath(backupDirectory + "/" + filename)
                .status("IN_PROGRESS")
                .type("MANUAL")
                .triggeredBy(triggeredBy)
                .startedAt(LocalDateTime.now())
                .build();
        record = backupHistoryRepository.save(record);
        final Long recordId = record.getId();

        // Run pg_dump asynchronously
        new Thread(() -> runPgDump(recordId, filename, triggeredBy)).start();

        return ResponseEntity.ok(ApiResponse.success(
                "Backup declenche — fichier: " + filename,
                Map.of("id", recordId, "filename", filename, "status", "IN_PROGRESS")));
    }

    private void runPgDump(Long recordId, String filename, String triggeredBy) {
        BackupHistory record = backupHistoryRepository.findById(recordId).orElse(null);
        if (record == null) return;

        try {
            // Parse DB connection from datasource URL
            // jdbc:postgresql://host:port/dbname
            String dbUrl  = datasourceUrl.replace("jdbc:postgresql://", "");
            String host   = dbUrl.split("/")[0].split(":")[0];
            String port   = dbUrl.split("/")[0].contains(":") ? dbUrl.split("/")[0].split(":")[1] : "5432";
            String dbName = dbUrl.split("/")[1].split("\\?")[0];

            // Ensure backup directory exists
            Path backupDir = Paths.get(backupDirectory);
            Files.createDirectories(backupDir);
            String outFile = backupDir.resolve(filename).toString();

            // Try pg_dump
            String pgDump = findPgDump();
            if (pgDump == null) {
                throw new RuntimeException("pg_dump introuvable sur ce serveur");
            }

            ProcessBuilder pb = new ProcessBuilder(pgDump,
                    "-h", host, "-p", port,
                    "-F", "p",   // plain SQL format
                    "-f", outFile,
                    dbName);
            pb.environment().put("PGPASSWORD",
                    System.getenv().getOrDefault("DB_PASSWORD",
                    System.getenv().getOrDefault("SPRING_DATASOURCE_PASSWORD", "")));
            pb.redirectErrorStream(true);

            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode == 0) {
                File outF = new File(outFile);
                record.setStatus("SUCCESS");
                record.setFileSizeKb(outF.exists() ? outF.length() / 1024 : 0);
                record.setCompletedAt(LocalDateTime.now());
                log.info("[Backup] Backup reussi: {}", filename);
            } else {
                String errOutput = new String(process.getInputStream().readAllBytes());
                record.setStatus("FAILED");
                record.setErrorMessage("pg_dump exit=" + exitCode + ": " + errOutput.substring(0, Math.min(errOutput.length(), 300)));
                record.setCompletedAt(LocalDateTime.now());
                log.error("[Backup] Backup echoue (exit {}): {}", exitCode, errOutput);
            }
        } catch (Exception e) {
            record.setStatus("FAILED");
            record.setErrorMessage(e.getMessage());
            record.setCompletedAt(LocalDateTime.now());
            log.error("[Backup] Erreur backup: {}", e.getMessage());
        }
        backupHistoryRepository.save(record);
    }

    private String findPgDump() {
        String[] candidates = {
            "pg_dump",
            "/usr/bin/pg_dump",
            "/usr/local/bin/pg_dump",
            "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",
            "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
            "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
        };
        for (String c : candidates) {
            try {
                File f = new File(c);
                if (f.exists() && f.canExecute()) return c;
                Process p = new ProcessBuilder(c, "--version").start();
                if (p.waitFor() == 0) return c;
            } catch (Exception ignored) {}
        }
        return null;
    }
}
