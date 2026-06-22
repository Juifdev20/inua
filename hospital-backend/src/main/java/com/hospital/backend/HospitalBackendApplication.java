package com.hospital.backend;

import com.hospital.backend.entity.Role;
import com.hospital.backend.repository.RoleRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
@EnableScheduling
@Slf4j
@RestController
public class HospitalBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(HospitalBackendApplication.class, args);
    }

    @GetMapping("/health")
    public String health() {
        return "OK - Backend is running";
    }

    @GetMapping("/api/auth/test")
    public String authTest() {
        return "Auth endpoint is accessible";
    }

    @Bean
    public CommandLineRunner logEndpoints(@Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping handlerMapping) {
        return args -> {
            log.info("========================================");
            log.info("REGISTERED ENDPOINTS:");
            handlerMapping.getHandlerMethods().forEach((key, value) -> {
                log.info("  {} -> {}", key, value);
            });
            log.info("========================================");
        };
    }

    /**
     * 🛡️ Initialise le rôle SUPERADMIN au premier démarrage.
     * Les développeurs doivent ensuite assigner ce rôle à leur compte manuellement
     * (UPDATE users SET role_id = (SELECT id FROM roles WHERE nom = 'ROLE_SUPERADMIN') WHERE email = 'dev@example.com';)
     */
    @Bean
    public CommandLineRunner initSuperAdminRole(RoleRepository roleRepository) {
        return args -> {
            if (!roleRepository.existsByNom("ROLE_SUPERADMIN")) {
                Role superAdmin = new Role();
                superAdmin.setNom("ROLE_SUPERADMIN");
                superAdmin.setDescription("Administrateur technique du système — accès complet à la gouvernance et à la sécurité");
                roleRepository.save(superAdmin);
                log.info("✅ [BOOT] Rôle ROLE_SUPERADMIN créé automatiquement.");
                log.info("⚠️  [BOOT] Assignez ce rôle à vos comptes développeurs via la base de données.");
            } else {
                log.info("✅ [BOOT] Rôle ROLE_SUPERADMIN déjà présent.");
            }
        };
    }

    @Bean
    public CommandLineRunner dropExamenCodeUniqueConstraint(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE examens DROP CONSTRAINT IF EXISTS ukdoc5xfspcwmwk5xk91rff0fgb");
                log.info("✅ [BOOT] Contrainte unique globale sur examens.code supprimée.");
            } catch (Exception e) {
                log.info("ℹ️ [BOOT] Contrainte unique sur examens.code déjà absente ou autre erreur: {}", e.getMessage());
            }
        };
    }
}
