package com.hospital.backend.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

import java.util.Properties;

/**
 * ★ TEST DE CONNEXION SMTP AU DÉMARRAGE
 * Vérifie immédiatement si la configuration email fonctionne
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SmtpHealthCheck {

    private final JavaMailSender mailSender;

    @PostConstruct
    public void checkSmtpConnection() {
        log.info("🔍 [SMTP HEALTH CHECK] Vérification de la connexion SMTP...");
        
        try {
            if (mailSender instanceof JavaMailSenderImpl) {
                JavaMailSenderImpl senderImpl = (JavaMailSenderImpl) mailSender;
                
                log.info("🔍 [SMTP HEALTH CHECK] Host: {}", senderImpl.getHost());
                log.info("🔍 [SMTP HEALTH CHECK] Port: {}", senderImpl.getPort());
                log.info("🔍 [SMTP HEALTH CHECK] Username: {}", 
                        senderImpl.getUsername() != null ? "✓ configuré" : "✗ MANQUANT !");
                log.info("🔍 [SMTP HEALTH CHECK] Password: {}", 
                        senderImpl.getPassword() != null && !senderImpl.getPassword().isEmpty() 
                                ? "✓ configuré (" + senderImpl.getPassword().length() + " caractères)" 
                                : "✗ MANQUANT !");
                
                Properties props = senderImpl.getJavaMailProperties();
                log.info("🔍 [SMTP HEALTH CHECK] SMTP Auth: {}", props.getProperty("mail.smtp.auth"));
                log.info("🔍 [SMTP HEALTH CHECK] SMTP StartTLS: {}", props.getProperty("mail.smtp.starttls.enable"));
                
                // ★ TEST DE CONNEXION SIMPLE
                log.info("🔍 [SMTP HEALTH CHECK] Test de connexion au serveur SMTP...");
                
                // Tentative de création de session
                jakarta.mail.Session session = jakarta.mail.Session.getInstance(props, 
                    new jakarta.mail.Authenticator() {
                        @Override
                        protected jakarta.mail.PasswordAuthentication getPasswordAuthentication() {
                            return new jakarta.mail.PasswordAuthentication(
                                senderImpl.getUsername(), 
                                senderImpl.getPassword()
                            );
                        }
                    });
                
                // Tentative de connexion
                try (jakarta.mail.Transport transport = session.getTransport("smtp")) {
                    transport.connect(senderImpl.getHost(), senderImpl.getPort(), 
                            senderImpl.getUsername(), senderImpl.getPassword());
                    log.info("✅ [SMTP HEALTH CHECK] CONNEXION SMTP RÉUSSIE !");
                }
                
            } else {
                log.warn("⚠️ [SMTP HEALTH CHECK] Impossible de vérifier - JavaMailSender n'est pas JavaMailSenderImpl");
            }
            
        } catch (jakarta.mail.AuthenticationFailedException e) {
            log.error("❌ [SMTP HEALTH CHECK] ÉCHEC AUTHENTIFICATION SMTP !");
            log.error("❌ [SMTP HEALTH CHECK] Message: {}", e.getMessage());
            log.error("❌ [SMTP HEALTH CHECK] CAUSES POSSIBLES:");
            log.error("   1. Mot de passe d'application Google incorrect");
            log.error("   2. L'authentification à 2 facteurs n'est pas activée sur le compte Gmail");
            log.error("   3. Le mot de passe d'application a été révoqué");
            log.error("   4. Le compte Gmail a une sécurité renforcée qui bloque les connexions SMTP");
            log.error("❌ [SMTP HEALTH CHECK] SOLUTION:");
            log.error("   1. Vérifiez sur https://myaccount.google.com/apppasswords");
            log.error("   2. Supprimez l'ancien mot de passe d'application et créez-en un nouveau");
            log.error("   3. Assurez-vous que 2FA est activée (obligatoire pour les mots de passe d'app)");
            log.error("   4. Vérifiez que 'Accès moins sécurisé' est désactivé (laisser activé = bloque SMTP)");
            
        } catch (Exception e) {
            log.error("❌ [SMTP HEALTH CHECK] Erreur de connexion SMTP: {}", e.getMessage(), e);
        }
    }
}
