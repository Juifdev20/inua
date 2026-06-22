package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.entity.EmailLog;
import com.hospital.backend.repository.EmailLogRepository;
import com.hospital.backend.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/superadmin/emails")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000"})
public class EmailManagementController {

    private final EmailLogRepository emailLogRepository;
    private final EmailService emailService;

    @GetMapping
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        try {
            Page<EmailLog> logs = emailLogRepository.findAllByOrderByCreatedAtDesc(
                    PageRequest.of(page, size));
            return ResponseEntity.ok(ApiResponse.success("Logs email", logs));
        } catch (Exception e) {
            log.error("[Email] Erreur logs: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur"));
        }
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> getStats() {
        try {
            List<Object[]> raw = emailLogRepository.countByStatus();
            Map<String, Long> stats = new LinkedHashMap<>();
            long total = 0;
            for (Object[] row : raw) {
                String status = (String) row[0];
                Long count  = (Long) row[1];
                stats.put(status, count);
                total += count;
            }
            stats.put("TOTAL", total);
            stats.put("PERMANENTLY_FAILED", emailLogRepository.countPermanentlyFailed());
            return ResponseEntity.ok(ApiResponse.success("Stats email", stats));
        } catch (Exception e) {
            log.error("[Email] Erreur stats: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur stats"));
        }
    }

    @PostMapping("/retry")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> retryFailed() {
        try {
            List<EmailLog> retryable = emailLogRepository
                    .findByStatusAndRetryCountLessThanOrderByCreatedAtAsc("FAILED", 3);
            int retried = 0;
            for (EmailLog el : retryable) {
                try {
                    emailService.sendHtmlEmail(el.getRecipient(), el.getSubject(),
                            "<p>Renvoi automatique — " + el.getSubject() + "</p>");
                    el.setStatus("SENT");
                    el.setSentAt(LocalDateTime.now());
                    retried++;
                } catch (Exception ex) {
                    el.setRetryCount(el.getRetryCount() + 1);
                    el.setErrorMessage(ex.getMessage());
                    if (el.getRetryCount() >= el.getMaxRetries()) {
                        el.setStatus("PERMANENTLY_FAILED");
                    }
                }
                el.setLastAttemptAt(LocalDateTime.now());
                emailLogRepository.save(el);
            }
            return ResponseEntity.ok(ApiResponse.success(
                    retried + " email(s) relancé(s) sur " + retryable.size(),
                    Map.of("retried", retried, "total", retryable.size())));
        } catch (Exception e) {
            log.error("[Email] Erreur retry: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur retry"));
        }
    }

    @PostMapping("/test")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> testSmtp(@RequestBody Map<String, String> body) {
        String to = body.getOrDefault("to", "");
        if (to.isBlank()) return ResponseEntity.badRequest().body(ApiResponse.error("Email destinataire manquant"));
        try {
            emailService.sendHtmlEmail(to,
                    "Test SMTP — Inua Afya SuperAdmin",
                    "<h2>Test SMTP reussi</h2><p>Envoye le " + LocalDateTime.now() + "</p>");
            return ResponseEntity.ok(ApiResponse.success("Email de test envoye a " + to, null));
        } catch (Exception e) {
            log.error("[Email] Test SMTP echec: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Echec SMTP: " + e.getMessage()));
        }
    }

    @DeleteMapping("/clear-old")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<?> clearOldLogs() {
        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
            List<EmailLog> old = emailLogRepository.findAll().stream()
                    .filter(e -> e.getCreatedAt() != null && e.getCreatedAt().isBefore(cutoff))
                    .toList();
            emailLogRepository.deleteAll(old);
            return ResponseEntity.ok(ApiResponse.success(
                    old.size() + " ancien(s) log(s) supprime(s)", null));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur suppression"));
        }
    }
}
