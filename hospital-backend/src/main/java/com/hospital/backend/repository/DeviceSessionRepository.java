package com.hospital.backend.repository;

import com.hospital.backend.entity.DeviceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceSessionRepository extends JpaRepository<DeviceSession, Long> {

    List<DeviceSession> findByDeviceIdAndUserId(String deviceId, Long userId);

    List<DeviceSession> findAllByOrderByLastSeenDesc();

    List<DeviceSession> findByBlockedTrue();

    boolean existsByDeviceIdAndBlockedTrue(String deviceId);

    @Modifying
    @Query("UPDATE DeviceSession d SET d.lastSeen = :lastSeen WHERE d.deviceId = :deviceId AND d.userId = :userId")
    void updateLastSeen(@Param("deviceId") String deviceId, @Param("userId") Long userId, @Param("lastSeen") LocalDateTime lastSeen);
}
