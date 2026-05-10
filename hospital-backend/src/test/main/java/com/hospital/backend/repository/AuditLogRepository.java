package com.hospital.backend.repository;

import com.hospital.backend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    // Spring Boot génère la requête SQL automatiquement grâce au nom de cette méthode
    List<AuditLog> findAllByOrderByDateDesc();
}