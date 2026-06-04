package com.hospital.backend.service;

import com.hospital.backend.entity.DeviceSession;
import com.hospital.backend.repository.DeviceSessionRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 📱 DeviceSessionService — Gestion des appareils connectés et blocage.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceSessionService {

    private final DeviceSessionRepository repository;

    /**
     * Enregistre ou met à jour un appareil à la connexion.
     */
    @Transactional
    public DeviceSession registerDevice(String deviceId, Long userId, String username,
                                        String ipAddress, String userAgent) {
        List<DeviceSession> existing = repository.findByDeviceIdAndUserId(deviceId, userId);

        if (!existing.isEmpty()) {
            DeviceSession ds = existing.get(0);
            ds.setLastSeen(LocalDateTime.now());
            ds.setIpAddress(ipAddress);
            ds.setUserAgent(userAgent);
            ds.setUsername(username);
            log.info("[DEVICE] Mise à jour session {} pour user {}", deviceId, username);
            return repository.save(ds);
        }

        DeviceSession ds = DeviceSession.builder()
                .deviceId(deviceId)
                .userId(userId)
                .username(username)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .firstSeen(LocalDateTime.now())
                .lastSeen(LocalDateTime.now())
                .blocked(false)
                .build();

        log.info("[DEVICE] Nouvel appareil enregistré {} pour user {}", deviceId, username);
        return repository.save(ds);
    }

    /**
     * Vérifie si l'appareil est bloqué (indépendamment du user).
     */
    @Transactional(readOnly = true)
    public boolean isDeviceBlocked(String deviceId) {
        if (deviceId == null || deviceId.isBlank()) return false;
        return repository.existsByDeviceIdAndBlockedTrue(deviceId);
    }

    /**
     * Bloque un appareil par son ID device.
     */
    @Transactional
    public void blockDevice(String deviceId, String reason) {
        List<DeviceSession> sessions = repository.findAll().stream()
                .filter(d -> d.getDeviceId().equals(deviceId))
                .toList();

        for (DeviceSession ds : sessions) {
            ds.setBlocked(true);
            ds.setBlockReason(reason);
            repository.save(ds);
        }
        log.warn("[DEVICE] Appareil {} BLOQUÉ — raison: {}", deviceId, reason);
    }

    /**
     * Débloque un appareil par son ID device.
     */
    @Transactional
    public void unblockDevice(String deviceId) {
        List<DeviceSession> sessions = repository.findAll().stream()
                .filter(d -> d.getDeviceId().equals(deviceId))
                .toList();

        for (DeviceSession ds : sessions) {
            ds.setBlocked(false);
            ds.setBlockReason(null);
            repository.save(ds);
        }
        log.info("[DEVICE] Appareil {} DÉBLOQUÉ", deviceId);
    }

    @Transactional(readOnly = true)
    public List<DeviceSession> getAllDevices() {
        return repository.findAllByOrderByLastSeenDesc();
    }

    @Transactional(readOnly = true)
    public List<DeviceSession> getBlockedDevices() {
        return repository.findByBlockedTrue();
    }
}
