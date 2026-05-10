package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.service.EmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * ★ CONTRÔLEUR POUR L'ENVOI D'EMAILS
 * Permet d'envoyer des notifications et de tester le service d'emails
 */
@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Email Service", description = "Gestion des notifications email")
@SecurityRequirement(name = "bearerAuth")
public class EmailController {

    private final EmailService emailService;

    /**
     * ★ ENVOYER LES CREDENTIALS PAR EMAIL
     * Envoie les identifiants de connexion à un nouvel utilisateur
     */
    @PostMapping("/send-credentials")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION')")
    @Operation(summary = "Envoyer les credentials par email", 
               description = "Envoie un email avec les identifiants de connexion au patient/staff")
    public ResponseEntity<?> sendCredentialsEmail(@RequestBody Map<String, String> request) {
        try {
            String to = request.get("to");
            String firstName = request.get("firstName");
            String lastName = request.get("lastName");
            String username = request.get("username");
            String password = request.get("password");
            String userType = request.get("userType"); // PATIENT ou STAFF

            // Validation
            if (to == null || to.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("L'adresse email est requise"));
            }

            if (!isValidEmail(to)) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Format d'email invalide"));
            }

            // Envoi asynchrone de l'email
            emailService.sendCredentialsEmail(to, firstName, lastName, username, password, userType);

            log.info("✅ [EMAIL] Credentials envoyés à {} pour {} {}", to, firstName, lastName);
            
            return ResponseEntity.ok(ApiResponse.success(
                "Email envoyé avec succès", 
                Map.of("recipient", to, "status", "sent")
            ));

        } catch (Exception e) {
            log.error("❌ [EMAIL] Erreur envoi credentials: {}", e.getMessage());
            return ResponseEntity.status(500)
                .body(ApiResponse.error("Erreur lors de l'envoi de l'email: " + e.getMessage()));
        }
    }

    /**
     * ★ RÉINITIALISATION DE MOT DE PASSE PAR EMAIL
     * Envoie un lien de réinitialisation
     */
    @PostMapping("/send-password-reset")
    @Operation(summary = "Envoyer email de réinitialisation", 
               description = "Envoie un email avec le lien de réinitialisation du mot de passe")
    public ResponseEntity<?> sendPasswordResetEmail(@RequestBody Map<String, String> request) {
        try {
            String to = request.get("to");
            String firstName = request.get("firstName");
            String resetToken = request.get("resetToken");

            if (to == null || to.isEmpty() || resetToken == null) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Email et token requis"));
            }

            emailService.sendPasswordResetEmail(to, firstName, resetToken);

            log.info("✅ [EMAIL] Réinitialisation envoyée à {}", to);
            
            return ResponseEntity.ok(ApiResponse.success(
                "Email de réinitialisation envoyé",
                Map.of("recipient", maskEmail(to))
            ));

        } catch (Exception e) {
            log.error("❌ [EMAIL] Erreur envoi réinitialisation: {}", e.getMessage());
            return ResponseEntity.status(500)
                .body(ApiResponse.error("Erreur lors de l'envoi"));
        }
    }

    /**
     * ★ CONFIRMATION DE RENDEZ-VOUS
     */
    @PostMapping("/send-appointment-confirmation")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTION', 'DOCTOR')")
    @Operation(summary = "Confirmer rendez-vous par email")
    public ResponseEntity<?> sendAppointmentConfirmation(@RequestBody Map<String, String> request) {
        try {
            String to = request.get("to");
            String patientName = request.get("patientName");
            String appointmentDate = request.get("appointmentDate");
            String doctorName = request.get("doctorName");
            String department = request.get("department");

            if (to == null || to.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Email requis"));
            }

            emailService.sendAppointmentConfirmation(to, patientName, appointmentDate, 
                                                      doctorName, department);

            return ResponseEntity.ok(ApiResponse.success("Confirmation envoyée"));

        } catch (Exception e) {
            log.error("❌ [EMAIL] Erreur confirmation: {}", e.getMessage());
            return ResponseEntity.status(500)
                .body(ApiResponse.error("Erreur envoi"));
        }
    }

    /**
     * ★ TEST DE CONNEXION SMTP
     * Vérifie que le service d'email est configuré correctement
     */
    @PostMapping("/test")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Tester la connexion email", description = "Envoie un email de test")
    public ResponseEntity<?> testEmailConnection(@RequestBody Map<String, String> request) {
        try {
            String to = request.get("to");
            
            if (to == null || to.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Adresse email requise"));
            }

            // Template de test simple
            String testHtml = """
                <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #37f49e;">✅ Test Inua Afya</h2>
                    <p>Ceci est un email de test pour vérifier la configuration SMTP.</p>
                    <p>Si vous recevez cet email, le service fonctionne correctement !</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        Envoyé le %s par Inua Afya
                    </p>
                </body>
                </html>
                """.formatted(java.time.LocalDateTime.now());

            emailService.sendHtmlEmail(to, "Test - Inua Afya Email Service", testHtml);

            return ResponseEntity.ok(ApiResponse.success(
                "Email de test envoyé avec succès",
                Map.of("recipient", to)
            ));

        } catch (Exception e) {
            log.error("❌ [EMAIL] Test échoué: {}", e.getMessage());
            return ResponseEntity.status(500)
                .body(ApiResponse.error("Test échoué: " + e.getMessage()));
        }
    }

    /**
     * ★ VÉRIFIER LA CONFIGURATION EMAIL
     */
    @GetMapping("/config-status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Vérifier la configuration email")
    public ResponseEntity<?> checkEmailConfig() {
        try {
            // Vérifier les propriétés configurées
            String mailHost = System.getProperty("spring.mail.host", "non configuré");
            String mailPort = System.getProperty("spring.mail.port", "non configuré");
            String mailUser = System.getProperty("spring.mail.username", "non configuré");
            
            boolean isConfigured = !"non configuré".equals(mailHost) && 
                                  !"non configuré".equals(mailUser);

            return ResponseEntity.ok(ApiResponse.success(
                "Configuration email",
                Map.of(
                    "configured", isConfigured,
                    "host", mailHost,
                    "port", mailPort,
                    "username", maskEmail(mailUser)
                )
            ));

        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error("Impossible de vérifier la configuration"));
        }
    }

    // ==================== MÉTHODES UTILITAIRES ====================

    /**
     * Valide le format d'un email
     */
    private boolean isValidEmail(String email) {
        String emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
        return email.matches(emailRegex);
    }

    /**
     * Masque l'email pour l'affichage (sécurité)
     */
    private String maskEmail(String email) {
        if (email == null || email.isEmpty()) return "";
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) return email;
        
        String localPart = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        
        String masked = localPart.charAt(0) + "***" + localPart.charAt(localPart.length()-1);
        return masked + domain;
    }
}
