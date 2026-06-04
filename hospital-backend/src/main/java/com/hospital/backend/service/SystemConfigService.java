package com.hospital.backend.service;

import com.hospital.backend.entity.SystemConfig;
import com.hospital.backend.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * ⚙️ SystemConfigService — Gestion des paramètres système en hot-reload
 *
 * Maintient un cache en mémoire pour éviter les accès DB répétés.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SystemConfigService {

    private final SystemConfigRepository repository;

    @Transactional(readOnly = true)
    public String getValue(String key, String defaultValue) {
        return repository.findByKey(key)
                .map(SystemConfig::getValue)
                .orElse(defaultValue);
    }

    @Transactional(readOnly = true)
    public boolean getBoolean(String key, boolean defaultValue) {
        String val = getValue(key, String.valueOf(defaultValue));
        return Boolean.parseBoolean(val);
    }

    @Transactional
    public void setValue(String key, String value, String description) {
        Optional<SystemConfig> existing = repository.findByKey(key);
        if (existing.isPresent()) {
            SystemConfig config = existing.get();
            config.setValue(value);
            config.setUpdatedAt(LocalDateTime.now());
            repository.save(config);
        } else {
            repository.save(SystemConfig.builder()
                    .key(key)
                    .value(value)
                    .description(description)
                    .updatedAt(LocalDateTime.now())
                    .build());
        }
        log.info("[SystemConfig] {} = {}", key, value);
    }

    /**
     * 🛡️ Mode maintenance — true = seuls les ADMIN peuvent accéder
     */
    @Transactional(readOnly = true)
    public boolean isMaintenanceMode() {
        return getBoolean("MAINTENANCE_MODE", false);
    }

    @Transactional
    public void setMaintenanceMode(boolean enabled, String message) {
        setValue("MAINTENANCE_MODE", String.valueOf(enabled),
                "Mode maintenance — " + (message != null ? message : "") + " (mis à jour le " + LocalDateTime.now() + ")");
    }
}
