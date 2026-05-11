package com.hospital.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * ★ CONFIGURATION EXPLICITE DU MAIL SENDER
 * Force les propriétés SMTP pour éviter les problèmes de lecture depuis application.properties
 */
@Configuration
@Slf4j
public class MailConfig {

    @Value("${EMAIL_HOST:${spring.mail.host:smtp.gmail.com}}")
    private String host;

    @Value("${EMAIL_PORT:${spring.mail.port:587}}")
    private int port;

    @Value("${EMAIL_USERNAME:${spring.mail.username:}}")
    private String username;

    @Value("${EMAIL_PASSWORD:${spring.mail.password:}}")
    private String password;

    @Value("${MAIL_FROM:${app.email.from:}}")
    private String fromEmail;

    @Bean
    public JavaMailSender javaMailSender() {
        log.info("🔧 [MAIL CONFIG] Configuration du JavaMailSender...");
        log.info("🔧 [MAIL CONFIG] Host: {}, Port: {}, Username: {}", host, port, 
                username != null && !username.isEmpty() ? "✓ configuré" : "✗ vide");
        
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(host);
        mailSender.setPort(port);
        
        // ★ Vérification que les credentials sont présents
        if (username == null || username.isEmpty()) {
            log.error("❌ [MAIL CONFIG] Username SMTP non configuré !");
        } else {
            mailSender.setUsername(username.trim()); // Trim pour enlever les espaces accidentels
        }
        
        if (password == null || password.isEmpty()) {
            log.error("❌ [MAIL CONFIG] Password SMTP non configuré !");
        } else {
            // ★ IMPORTANT: Ne pas trim le mot de passe, mais logger sa longueur pour debug
            log.info("🔧 [MAIL CONFIG] Password length: {}", password.length());
            mailSender.setPassword(password);
        }

        // ★ Configuration SMTP complète
        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");
        props.put("mail.smtp.writetimeout", "5000");
        props.put("mail.debug", "true");

        log.info("✅ [MAIL CONFIG] JavaMailSender configuré avec succès");
        return mailSender;
    }
}
