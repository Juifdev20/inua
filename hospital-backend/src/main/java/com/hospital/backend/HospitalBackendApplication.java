package com.hospital.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;

@SpringBootApplication
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

    @Bean
    public CommandLineRunner logEndpoints(RequestMappingHandlerMapping handlerMapping) {
        return args -> {
            log.info("========================================");
            log.info("REGISTERED ENDPOINTS:");
            handlerMapping.getHandlerMethods().forEach((key, value) -> {
                log.info("  {} -> {}", key, value);
            });
            log.info("========================================");
        };
    }
}
