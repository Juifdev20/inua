package com.hospital.backend.service.impl;

import com.hospital.backend.entity.EmailLog;
import com.hospital.backend.repository.EmailLogRepository;
import com.hospital.backend.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/**
 * ★ IMPLÉMENTATION DU SERVICE D'EMAILS
 * Gère l'envoi asynchrone des notifications email
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    private final EmailLogRepository emailLogRepository;

    @Value("${app.email.from:${spring.mail.username}}")
    private String fromEmail;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.name:Inua Afya}")
    private String appName;

    @Value("${app.email.fallback:noreply@inuaafya.com}")
    private String fallbackEmail;

    @Override
    @Async("taskExecutor")
    public void sendCredentialsEmail(String to, String firstName, String lastName, 
                                    String username, String tempPassword, String userType) {
        try {
            log.info("📧 [EMAIL] Envoi credentials à {} pour {} {}", to, firstName, lastName);

            String subject = "Bienvenue sur " + appName + " - Vos accès de connexion";
            String htmlContent = buildCredentialsEmailTemplate(firstName, lastName, username, 
                                                              tempPassword, userType);

            sendHtmlEmailInternal(to, subject, htmlContent);
            log.info("✅ [EMAIL] Credentials envoyés avec succès à {}", to);

        } catch (Exception e) {
            log.error("❌ [EMAIL] Erreur envoi credentials à {}: {}", to, e.getMessage());
        }
    }

    @Override
    // ★ TEMPORAIREMENT SYNCHRONE pour debug SMTP - remettre @Async après correction
    // @Async("taskExecutor")
    public void sendPasswordResetEmail(String to, String firstName, String resetToken) {
        try {
            log.info("📧 [EMAIL] Envoi réinitialisation MDP à {} pour {}", to, firstName);
            
            // ★ Vérifications préliminaires
            if (to == null || to.isEmpty()) {
                throw new IllegalArgumentException("L'adresse email du destinataire est vide");
            }
            if (resetToken == null || resetToken.isEmpty()) {
                throw new IllegalArgumentException("Le token de réinitialisation est vide");
            }

            String subject = appName + " - Réinitialisation de votre mot de passe";
            String resetLink = frontendUrl + "/reset-password?token=" + resetToken;
            String htmlContent = buildPasswordResetTemplate(firstName, resetLink, resetToken);

            sendHtmlEmailInternal(to, subject, htmlContent);
            log.info("✅ [EMAIL] Réinitialisation MDP envoyée avec SUCCÈS à {}", to);

        } catch (Exception e) {
            log.error("❌ [EMAIL] ÉCHEC envoi réinitialisation à {}: {}", to, e.getMessage(), e);
            // ★ Propager l'exception pour que AuthServiceImpl puisse la gérer
            throw new RuntimeException("Échec de l'envoi de l'email de réinitialisation: " + e.getMessage(), e);
        }
    }

    @Override
    @Async("taskExecutor")
    public void sendAppointmentConfirmation(String to, String patientName, String appointmentDate, 
                                           String doctorName, String department) {
        try {
            log.info("📧 [EMAIL] Envoi confirmation RDV à {}", to);

            String subject = appName + " - Confirmation de votre rendez-vous";
            String htmlContent = buildAppointmentConfirmationTemplate(patientName, appointmentDate, 
                                                                     doctorName, department);

            sendHtmlEmailInternal(to, subject, htmlContent);
            log.info("✅ [EMAIL] Confirmation RDV envoyée à {}", to);

        } catch (Exception e) {
            log.error("❌ [EMAIL] Erreur envoi confirmation RDV à {}: {}", to, e.getMessage());
        }
    }

    @Override
    @Async("taskExecutor")
    public void sendAppointmentReminder(String to, String patientName, String appointmentDate, 
                                         String doctorName) {
        try {
            log.info("📧 [EMAIL] Envoi rappel RDV à {}", to);

            String subject = appName + " - Rappel : Rendez-vous demain";
            String htmlContent = buildAppointmentReminderTemplate(patientName, appointmentDate, doctorName);

            sendHtmlEmailInternal(to, subject, htmlContent);
            log.info("✅ [EMAIL] Rappel RDV envoyé à {}", to);

        } catch (Exception e) {
            log.error("❌ [EMAIL] Erreur envoi rappel à {}: {}", to, e.getMessage());
        }
    }

    @Override
    @Async("taskExecutor")
    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        try {
            log.info("📧 [EMAIL] Envoi email générique à {}", to);
            sendHtmlEmailInternal(to, subject, htmlContent);
            log.info("✅ [EMAIL] Email générique envoyé à {}", to);

        } catch (Exception e) {
            log.error("❌ [EMAIL] Erreur envoi email à {}: {}", to, e.getMessage());
        }
    }

    @Override
    @Async("taskExecutor")
    public void sendMagicCodeEmail(String to, String firstName, String code) {
        try {
            log.info("📧 [EMAIL] Envoi code magique à {}", to);

            String subject = appName + " - Votre code de connexion temporaire";
            String htmlContent = buildMagicCodeTemplate(firstName, code);

            sendHtmlEmailInternal(to, subject, htmlContent);
            log.info("✅ [EMAIL] Code magique envoyé à {}", to);

        } catch (Exception e) {
            log.error("❌ [EMAIL] Erreur envoi code magique à {}: {}", to, e.getMessage());
            throw new RuntimeException("Échec de l'envoi du code de connexion: " + e.getMessage(), e);
        }
    }

    @Override
    @Async("taskExecutor")
    public void sendPrescriptionReadyEmail(String to, String patientName, String prescriptionCode, String doctorName) {
        try {
            log.info("📧 [EMAIL] Envoi notification prescription prête à {}", to);

            String subject = appName + " - Vos médicaments sont prêts";
            String htmlContent = buildPrescriptionReadyTemplate(patientName, prescriptionCode, doctorName);

            sendHtmlEmailInternal(to, subject, htmlContent);
            log.info("✅ [EMAIL] Notification prescription prête envoyée à {}", to);

        } catch (Exception e) {
            log.error("❌ [EMAIL] Erreur envoi notification prescription à {}: {}", to, e.getMessage());
        }
    }

    /**
     * ★ TEMPLATE HTML - Prescription prête à être retirée
     */
    private String buildPrescriptionReadyTemplate(String patientName, String prescriptionCode, String doctorName) {
        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Vos médicaments sont prêts - Inua Afya</title>
                <style>
                    @media only screen and (max-width: 600px) {
                        .container { width: 100%% !important; padding: 10px !important; }
                        .content { padding: 20px !important; }
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background-color: #f5f5f5;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: #ffffff;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #8B5CF6 0%%, #7C3AED 100%%);
                        padding: 30px;
                        text-align: center;
                        color: white;
                    }
                    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                    .content { padding: 40px 30px; color: #333; }
                    .greeting { font-size: 22px; color: #2c3e50; margin-bottom: 20px; font-weight: 600; }
                    .message { color: #555; margin-bottom: 25px; line-height: 1.6; }
                    .info-box {
                        background: linear-gradient(135deg, #f8fffe 0%%, #e6f9f1 100%%);
                        border: 2px solid #37f49e;
                        border-radius: 10px;
                        padding: 25px;
                        margin: 25px 0;
                    }
                    .info-box h3 { color: #2c3e50; margin-top: 0; font-size: 18px; }
                    .prescription-code {
                        background: #f8f9fa;
                        border: 2px dashed #dee2e6;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 8px;
                        text-align: center;
                        font-family: monospace;
                        font-size: 18px;
                        font-weight: 600;
                        color: #8B5CF6;
                    }
                    .button-container { text-align: center; margin: 30px 0; }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #8B5CF6 0%%, #7C3AED 100%%);
                        color: white;
                        padding: 15px 40px;
                        text-decoration: none;
                        border-radius: 30px;
                        font-weight: 600;
                        font-size: 16px;
                        box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
                    }
                    .footer {
                        background: #f8f9fa;
                        padding: 20px;
                        text-align: center;
                        color: #6c757d;
                        font-size: 13px;
                        border-top: 1px solid #e9ecef;
                    }
                    .warning {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 5px;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>💊 Vos médicaments sont prêts</h1>
                    </div>

                    <div class="content">
                        <div class="greeting">Bonjour %s,</div>

                        <div class="message">
                            Votre ordonnance prescrite par <strong>Dr. %s</strong> a été validée par notre pharmacie.
                            Vos médicaments sont maintenant <strong>prêts à être retirés</strong>.
                        </div>

                        <div class="prescription-code">
                            Ordonnance N° : %s
                        </div>

                        <div class="info-box">
                            <h3>📍 Comment retirer vos médicaments</h3>
                            <p>Présentez-vous à la pharmacie avec :</p>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>Votre carte de patient ou pièce d'identité</li>
                                <li>Le numéro de votre ordonnance ci-dessus</li>
                            </ul>
                        </div>

                        <div class="button-container">
                            <a href="%s/patient/notifications" class="button">Voir mes notifications</a>
                        </div>

                        <div class="warning">
                            <strong>⏰ Important :</strong> Merci de venir retirer vos médicaments dans les <strong>48 heures</strong>.
                            Passé ce délai, votre ordonnance pourrait être retournée au stock.
                        </div>
                    </div>

                    <div class="footer">
                        <p><strong>Inua Afya</strong> - Hôpital Moderne</p>
                        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                        <p>© 2026 Inua Afya. Tous droits réservés.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(patientName, doctorName, prescriptionCode, frontendUrl);
    }

    /**
     * ★ TEMPLATE HTML - Code de connexion temporaire (Magic Code)
     */
    private String buildMagicCodeTemplate(String firstName, String code) {
        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Code de connexion - Inua Afya</title>
                <style>
                    @media only screen and (max-width: 600px) {
                        .container { width: 100%% !important; padding: 10px !important; }
                        .content { padding: 20px !important; }
                        .code-box { font-size: 32px !important; }
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background-color: #f5f5f5;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: #ffffff;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #37f49e 0%%, #2dd18a 100%%);
                        padding: 30px;
                        text-align: center;
                        color: white;
                    }
                    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
                    .content { padding: 40px 30px; color: #333; text-align: center; }
                    .greeting { font-size: 22px; color: #2c3e50; margin-bottom: 20px; font-weight: 600; }
                    .message { color: #555; margin-bottom: 30px; font-size: 16px; line-height: 1.6; }
                    .code-box {
                        background: linear-gradient(135deg, #f8fffe 0%%, #e6f9f1 100%%);
                        border: 3px solid #37f49e;
                        border-radius: 15px;
                        padding: 30px;
                        margin: 30px 0;
                        font-size: 42px;
                        font-weight: 700;
                        letter-spacing: 8px;
                        color: #2c3e50;
                        font-family: 'Courier New', monospace;
                        text-align: center;
                        box-shadow: 0 4px 15px rgba(55, 244, 158, 0.2);
                    }
                    .info-box {
                        background: #fff8e6;
                        border-left: 4px solid #f1c40f;
                        padding: 20px;
                        margin: 25px 0;
                        border-radius: 8px;
                        text-align: left;
                    }
                    .info-box strong { color: #856404; }
                    .footer {
                        background: #f8f9fa;
                        padding: 20px;
                        text-align: center;
                        color: #6c757d;
                        font-size: 13px;
                        border-top: 1px solid #e9ecef;
                    }
                    .security-tips {
                        background: #e8f4fd;
                        border-radius: 8px;
                        padding: 15px;
                        margin: 20px 0;
                        font-size: 14px;
                        color: #1a5276;
                        text-align: left;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Code de connexion</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Inua Afya - Connexion sécurisée</p>
                    </div>

                    <div class="content">
                        <div class="greeting">Bonjour %s,</div>

                        <div class="message">
                            Voici votre code de connexion temporaire pour accéder à votre compte <strong>Inua Afya</strong>.
                        </div>

                        <div class="code-box">%s</div>

                        <div class="info-box">
                            <strong>⏰ Validité :</strong> Ce code est valable pendant <strong>10 minutes</strong> uniquement.<br>
                            <strong>🔒 Usage unique :</strong> Ce code ne peut être utilisé qu'une seule fois.
                        </div>

                        <div class="security-tips">
                            <strong>💡 Conseils de sécurité :</strong>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>Ne partagez jamais ce code avec qui que ce soit</li>
                                <li>Notre équipe ne vous demandera jamais ce code</li>
                                <li>Si vous n'avez pas demandé ce code, ignorez cet email</li>
                            </ul>
                        </div>
                    </div>

                    <div class="footer">
                        <p><strong>Inua Afya</strong> - Hôpital Moderne</p>
                        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                        <p>© 2026 Inua Afya. Tous droits réservés.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(firstName != null ? firstName : "Utilisateur", code);
    }

    /**
     * ★ Méthode interne pour envoyer l'email avec gestion d'erreur robuste
     */
    private void logEmail(String to, String subject, String type, String status, String error) {
        try {
            com.hospital.backend.entity.EmailLog emailLog = com.hospital.backend.entity.EmailLog.builder()
                    .recipient(to)
                    .subject(subject)
                    .type(type)
                    .status(status)
                    .errorMessage(error)
                    .sentAt("SENT".equals(status) ? java.time.LocalDateTime.now() : null)
                    .build();
            emailLogRepository.save(emailLog);
        } catch (Exception ex) {
            log.warn("[EMAIL LOG] Could not save email log: {}", ex.getMessage());
        }
    }

        private void sendHtmlEmailInternal(String to, String subject, String htmlContent)
            throws Exception {
        
        log.info("📧 [EMAIL INTERNAL] Préparation email pour: {}", to);
        log.info("📧 [EMAIL INTERNAL] From: [{}], Subject: {}", fromEmail, subject);
        log.info("📧 [EMAIL INTERNAL] From length: {}, From bytes: {}", 
                fromEmail != null ? fromEmail.length() : "null",
                fromEmail != null ? fromEmail.getBytes(StandardCharsets.UTF_8) : "null");
        
        // ★ Vérification préliminaire des credentials
        if (fromEmail == null || fromEmail.isEmpty()) {
            throw new IllegalStateException("L'adresse d'expéditeur (fromEmail) n'est pas configurée");
        }
        
        // ★ Nettoyage et validation de l'adresse email
        String cleanFromEmail = fromEmail.trim();
        
        // Vérifier les caractères problématiques
        if (cleanFromEmail.contains("Ã") || cleanFromEmail.contains("©") || cleanFromEmail.length() > 100) {
            log.error("❌ [EMAIL INTERNAL] Adresse fromEmail contient des caractères invalides: {}", cleanFromEmail);
            // Utiliser une adresse de repli si configurée, sinon lancer une erreur
            cleanFromEmail = fallbackEmail != null && !fallbackEmail.isEmpty() ? fallbackEmail : "noreply@inuaafya.com";
            log.warn("⚠️ [EMAIL INTERNAL] Utilisation de l'adresse de repli: {}", cleanFromEmail);
        }
        
        // Validation basique du format email
        if (!cleanFromEmail.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            log.error("❌ [EMAIL INTERNAL] Format d'adresse fromEmail invalide: {}", cleanFromEmail);
            throw new IllegalStateException("Format de l'adresse d'expéditeur invalide: " + cleanFromEmail);
        }
        
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message,
                MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                StandardCharsets.UTF_8.name());

            helper.setFrom(cleanFromEmail, appName);
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            log.info("📧 [EMAIL INTERNAL] Envoi du message...");
            mailSender.send(message);
            log.info("✅ [EMAIL INTERNAL] Message envoyé avec succès à {}", to);
            
        } catch (jakarta.mail.AuthenticationFailedException e) {
            log.error("❌ [EMAIL INTERNAL] ÉCHEC AUTHENTIFICATION SMTP: {}", e.getMessage());
            log.error("❌ [EMAIL INTERNAL] Vérifiez: 1) Mot de passe d'application Google, 2) 2FA activée, 3) Host/Port SMTP");
            logEmail(to, subject, "GENERIC", "FAILED", "Auth SMTP echouee: " + e.getMessage());
            throw new RuntimeException("Authentification SMTP échouée. Vérifiez les credentials dans MailConfig.java", e);
            
        } catch (jakarta.mail.MessagingException e) {
            log.error("❌ [EMAIL INTERNAL] Erreur messaging: {}", e.getMessage(), e);
            throw e;
            
        } catch (Exception e) {
            log.error("❌ [EMAIL INTERNAL] Erreur inattendue: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * ★ TEMPLATE HTML - Email de bienvenue avec credentials
     */
    private String buildCredentialsEmailTemplate(String firstName, String lastName, 
                                                 String username, String password, 
                                                 String userType) {
        String userTypeLabel = "PATIENT".equals(userType) ? "Patient" : "Membre du personnel";
        
        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Bienvenue sur Inua Afya</title>
                <title>Bienvenue sur Inua Afia</title>
                <style>
                    @media only screen and (max-width: 600px) {
                        .container { width: 100%% !important; padding: 10px !important; }
                        .content { padding: 20px !important; }
                        .credentials-box { padding: 15px !important; }
                        .button { width: 100%% !important; }
                    }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        background-color: #f5f5f5; 
                        margin: 0; 
                        padding: 20px; 
                        line-height: 1.6;
                    }
                    .container { 
                        max-width: 600px; 
                        margin: 0 auto; 
                        background: #ffffff; 
                        border-radius: 12px; 
                        overflow: hidden; 
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    }
                    .header { 
                        background: linear-gradient(135deg, #37f49e 0%%, #2dd18a 100%%); 
                        padding: 30px; 
                        text-align: center; 
                        color: white;
                    }
                    .header h1 { 
                        margin: 0; 
                        font-size: 28px; 
                        font-weight: 600;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .header-icon {
                        font-size: 48px;
                        margin-bottom: 10px;
                    }
                    .content { 
                        padding: 40px 30px; 
                        color: #333;
                    }
                    .greeting {
                        font-size: 22px;
                        color: #2c3e50;
                        margin-bottom: 20px;
                        font-weight: 600;
                    }
                    .message {
                        color: #555;
                        margin-bottom: 25px;
                        font-size: 16px;
                    }
                    .credentials-box { 
                        background: linear-gradient(135deg, #f8fffe 0%%, #e6f9f1 100%%); 
                        border: 2px solid #37f49e; 
                        border-radius: 10px; 
                        padding: 25px; 
                        margin: 25px 0;
                    }
                    .credentials-box h3 {
                        color: #2c3e50;
                        margin-top: 0;
                        font-size: 18px;
                    }
                    .credential-item {
                        background: white;
                        padding: 15px;
                        margin: 10px 0;
                        border-radius: 8px;
                        border-left: 4px solid #37f49e;
                    }
                    .credential-label {
                        font-size: 12px;
                        color: #7f8c8d;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        margin-bottom: 5px;
                    }
                    .credential-value {
                        font-size: 18px;
                        font-weight: 600;
                        color: #2c3e50;
                        font-family: 'Courier New', monospace;
                    }
                    .button-container {
                        text-align: center;
                        margin: 30px 0;
                    }
                    .button { 
                        display: inline-block; 
                        background: linear-gradient(135deg, #37f49e 0%%, #2dd18a 100%%); 
                        color: white; 
                        padding: 15px 40px; 
                        text-decoration: none; 
                        border-radius: 30px; 
                        font-weight: 600; 
                        font-size: 16px;
                        box-shadow: 0 4px 15px rgba(55, 244, 158, 0.3);
                        transition: transform 0.2s;
                    }
                    .button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(55, 244, 158, 0.4);
                    }
                    .warning-box {
                        background: #fff8e6;
                        border-left: 4px solid #f1c40f;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 5px;
                        font-size: 14px;
                        color: #856404;
                    }
                    .footer { 
                        background: #f8f9fa; 
                        padding: 20px; 
                        text-align: center; 
                        color: #6c757d; 
                        font-size: 13px;
                        border-top: 1px solid #e9ecef;
                    }
                    .footer a {
                        color: #37f49e;
                        text-decoration: none;
                    }
                    .divider {
                        height: 1px;
                        background: linear-gradient(to right, transparent, #37f49e, transparent);
                        margin: 30px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="header-icon">🏥</div>
                        <h1>Inua Afya</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Votre santé, notre priorité</p>
                    </div>
                    
                    <div class="content">
                        <div class="greeting">Bonjour %s %s,</div>
                        
                        <div class="message">
                            Bienvenue sur <strong>Inua Afya</strong> ! Votre compte %s a été créé avec succès.
                            Vous trouverez ci-dessous vos identifiants de connexion.
                        </div>
                        
                        <div class="credentials-box">
                            <h3>🔐 Vos accès de connexion</h3>
                            
                            <div class="credential-item">
                                <div class="credential-label">Identifiant</div>
                                <div class="credential-value">%s</div>
                            </div>
                            
                            <div class="credential-item">
                                <div class="credential-label">Mot de passe temporaire</div>
                                <div class="credential-value">%s</div>
                            </div>
                        </div>
                        
                        <div class="warning-box">
                            <strong>⚠️ Important :</strong> Pour votre sécurité, vous devrez changer ce mot de passe 
                            lors de votre première connexion.
                        </div>
                        
                        <div class="button-container">
                            <a href="%s/login" class="button">Se connecter</a>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <div class="message" style="font-size: 14px; color: #666;">
                            Si vous n'avez pas demandé la création de ce compte, veuillez ignorer cet email 
                            ou contacter notre équipe de support.
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Inua Afya</strong> - Hôpital Moderne</p>
                        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                        <p>© 2026 Inua Afya. Tous droits réservés.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(firstName, lastName, userTypeLabel, username, password, frontendUrl);
    }

    /**
     * ★ TEMPLATE HTML - Réinitialisation de mot de passe
     */
    private String buildPasswordResetTemplate(String firstName, String resetLink, String resetToken) {
        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Réinitialisation de mot de passe - Inua Afya</title>
                <title>Réinitialisation de mot de passe - Inua Afia</title>
                <style>
                    @media only screen and (max-width: 600px) {
                        .container { width: 100%% !important; padding: 10px !important; }
                        .content { padding: 20px !important; }
                        .button { width: 100%% !important; }
                    }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        background-color: #f5f5f5; 
                        margin: 0; 
                        padding: 20px;
                    }
                    .container { 
                        max-width: 600px; 
                        margin: 0 auto; 
                        background: #ffffff; 
                        border-radius: 12px; 
                        overflow: hidden; 
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    }
                    .header { 
                        background: linear-gradient(135deg, #ff6b6b 0%%, #ee5a5a 100%%); 
                        padding: 30px; 
                        text-align: center; 
                        color: white;
                    }
                    .header h1 { margin: 0; font-size: 24px; }
                    .content { padding: 40px 30px; color: #333; }
                    .greeting { font-size: 20px; color: #2c3e50; margin-bottom: 20px; }
                    .message { color: #555; margin-bottom: 25px; line-height: 1.6; }
                    .button-container { text-align: center; margin: 30px 0; }
                    .button { 
                        display: inline-block; 
                        background: linear-gradient(135deg, #ff6b6b 0%%, #ee5a5a 100%%); 
                        color: white; 
                        padding: 15px 40px; 
                        text-decoration: none; 
                        border-radius: 30px; 
                        font-weight: 600;
                        box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
                    }
                    .token-box {
                        background: #f8f9fa;
                        border: 2px dashed #dee2e6;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 8px;
                        text-align: center;
                        word-break: break-all;
                        font-family: monospace;
                        font-size: 14px;
                    }
                    .footer { 
                        background: #f8f9fa; 
                        padding: 20px; 
                        text-align: center; 
                        color: #6c757d; 
                        font-size: 13px;
                    }
                    .warning {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 5px;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔒 Réinitialisation de mot de passe</h1>
                    </div>
                    
                    <div class="content">
                        <div class="greeting">Bonjour %s,</div>
                        
                        <div class="message">
                            Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte 
                            <strong>Inua Afya</strong>. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
                            <strong>Inua Afia</strong>. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
                        </div>
                        
                        <div class="button-container">
                            <a href="%s" class="button">Réinitialiser mon mot de passe</a>
                        </div>
                        
                        <div class="warning">
                            <strong>⚠️ Sécurité :</strong> Ce lien est valable pendant <strong>10 minutes</strong> uniquement.
                            Si vous n'avez pas fait cette demande, veuillez ignorer cet email.
                        </div>
                        
                        <div class="message" style="font-size: 14px; color: #666;">
                            Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
                        </div>
                        
                        <div class="token-box">
                            %s
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Inua Afya</strong> - Hôpital Moderne</p>
                        <p>© 2026 Inua Afya. Tous droits réservés.</p>
                        <p><strong>Inua Afia</strong> - Hôpital Moderne</p>
                        <p>© 2026 Inua Afia. Tous droits réservés.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(firstName, resetLink, resetLink);
    }

    /**
     * ★ TEMPLATE HTML - Confirmation de rendez-vous
     */
    private String buildAppointmentConfirmationTemplate(String patientName, String appointmentDate, 
                                                        String doctorName, String department) {
        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Confirmation de rendez-vous - Inua Afya</title>
                <title>Confirmation de rendez-vous - Inua Afia</title>
                <style>
                    @media only screen and (max-width: 600px) {
                        .container { width: 100%% !important; }
                        .content { padding: 20px !important; }
                    }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        background-color: #f5f5f5; 
                        margin: 0; 
                        padding: 20px;
                    }
                    .container { 
                        max-width: 600px; 
                        margin: 0 auto; 
                        background: #ffffff; 
                        border-radius: 12px; 
                        overflow: hidden; 
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    }
                    .header { 
                        background: linear-gradient(135deg, #3498db 0%%, #2980b9 100%%); 
                        padding: 30px; 
                        text-align: center; 
                        color: white;
                    }
                    .content { padding: 40px 30px; color: #333; }
                    .appointment-card {
                        background: linear-gradient(135deg, #e8f4f8 0%%, #d1e8f0 100%%);
                        border-radius: 10px;
                        padding: 25px;
                        margin: 20px 0;
                        border-left: 5px solid #3498db;
                    }
                    .detail-row {
                        display: flex;
                        margin: 12px 0;
                        padding: 8px 0;
                        border-bottom: 1px dashed #bdc3c7;
                    }
                    .detail-label {
                        font-weight: 600;
                        color: #7f8c8d;
                        width: 120px;
                    }
                    .detail-value {
                        color: #2c3e50;
                        font-weight: 500;
                    }
                    .footer { 
                        background: #f8f9fa; 
                        padding: 20px; 
                        text-align: center; 
                        color: #6c757d; 
                        font-size: 13px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📅 Confirmation de rendez-vous</h1>
                    </div>
                    
                    <div class="content">
                        <h2>Bonjour %s,</h2>
                        <p>Votre rendez-vous a été confirmé avec succès.</p>
                        
                        <div class="appointment-card">
                            <div class="detail-row">
                                <span class="detail-label">Date & Heure</span>
                                <span class="detail-value">%s</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Médecin</span>
                                <span class="detail-value">Dr. %s</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Département</span>
                                <span class="detail-value">%s</span>
                            </div>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">
                            Merci d'arriver 15 minutes avant l'heure prévue. En cas d'empêchement, 
                            veuillez nous contacter au plus vite.
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Inua Afya</strong> - Hôpital Moderne</p>
                        <p><strong>Inua Afia</strong> - Hôpital Moderne</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(patientName, appointmentDate, doctorName, department);
    }

    /**
     * ★ TEMPLATE HTML - Rappel de rendez-vous
     */
    private String buildAppointmentReminderTemplate(String patientName, String appointmentDate, 
                                                      String doctorName) {
        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Rappel de rendez-vous - Inua Afya</title>
                <title>Rappel de rendez-vous - Inua Afia</title>
                <style>
                    @media only screen and (max-width: 600px) {
                        .container { width: 100%% !important; }
                    }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        background-color: #f5f5f5; 
                        margin: 0; 
                        padding: 20px;
                    }
                    .container { 
                        max-width: 600px; 
                        margin: 0 auto; 
                        background: #ffffff; 
                        border-radius: 12px; 
                        overflow: hidden; 
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    }
                    .header { 
                        background: linear-gradient(135deg, #f39c12 0%%, #e67e22 100%%); 
                        padding: 30px; 
                        text-align: center; 
                        color: white;
                    }
                    .content { padding: 40px 30px; color: #333; }
                    .reminder-box {
                        background: #fff8e6;
                        border: 2px solid #f1c40f;
                        border-radius: 10px;
                        padding: 25px;
                        margin: 20px 0;
                        text-align: center;
                    }
                    .date-highlight {
                        font-size: 24px;
                        font-weight: 700;
                        color: #e67e22;
                        margin: 15px 0;
                    }
                    .footer { 
                        background: #f8f9fa; 
                        padding: 20px; 
                        text-align: center; 
                        color: #6c757d; 
                        font-size: 13px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⏰ Rappel de rendez-vous</h1>
                    </div>
                    
                    <div class="content">
                        <h2>Bonjour %s,</h2>
                        <p>Nous vous rappelons que vous avez un rendez-vous médical demain :</p>
                        
                        <div class="reminder-box">
                            <div class="date-highlight">📅 %s</div>
                            <p>avec le <strong>Dr. %s</strong></p>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">
                            Pensez à apporter vos documents médicaux et votre carte d'identité.
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Inua Afya</strong> - Hôpital Moderne</p>
                        <p><strong>Inua Afia</strong> - Hôpital Moderne</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(patientName, appointmentDate, doctorName);
    }
}

