package com.hospital.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * ⚙️ JpaAuditingConfig - Active l'auditing automatique JPA
 *
 * Cette configuration active les annotations Spring Data JPA :
 * - @CreatedBy      → rempli par AuditorAwareImpl
 * - @LastModifiedBy  → rempli par AuditorAwareImpl
 * - @CreatedDate     → date de création auto
 * - @LastModifiedDate→ date de modification auto
 *
 * L'auditorAwareRef pointe vers le bean "auditorAwareImpl" défini
 * dans com.hospital.backend.security.AuditorAwareImpl
 */
@Configuration
@EnableAspectJAutoProxy
@EnableJpaAuditing(auditorAwareRef = "auditorAwareImpl")
public class JpaAuditingConfig {
    // Pas de bean supplémentaire requis ici.
    // L'activation se fait par annotation.
}
