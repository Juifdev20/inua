package com.hospital.backend.repository;

import com.hospital.backend.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findAllByOrderByDateDesc();

    // ★ MULTI-TENANT: filtrer par hôpital
    List<AuditLog> findByHospitalIdOrderByDateDesc(Long hospitalId);

    // ─── FILTRAGES POUR SUPERADMIN ───

    Page<AuditLog> findByUtilisateurContainingIgnoreCase(String utilisateur, Pageable pageable);

    Page<AuditLog> findByActionContainingIgnoreCase(String action, Pageable pageable);

    Page<AuditLog> findByCibleContainingIgnoreCase(String cible, Pageable pageable);

    Page<AuditLog> findByTypeIgnoreCase(String type, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.date BETWEEN :start AND :end ORDER BY a.date DESC")
    Page<AuditLog> findByDateBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:userNull = true OR LOWER(a.utilisateur) LIKE :userPattern) AND " +
           "(:actionNull = true OR LOWER(a.action) LIKE :actionPattern) AND " +
           "(:typeNull = true OR LOWER(a.type) = :typeLower) AND " +
           "(:cibleNull = true OR LOWER(a.cible) LIKE :ciblePattern) AND " +
           "(:startNull = true OR a.date >= :start) AND " +
           "(:endNull = true OR a.date <= :end) " +
           "ORDER BY a.date DESC")
    Page<AuditLog> searchLogs(
            @Param("userNull") boolean userNull,
            @Param("userPattern") String userPattern,
            @Param("actionNull") boolean actionNull,
            @Param("actionPattern") String actionPattern,
            @Param("typeNull") boolean typeNull,
            @Param("typeLower") String typeLower,
            @Param("cibleNull") boolean cibleNull,
            @Param("ciblePattern") String ciblePattern,
            @Param("startNull") boolean startNull,
            @Param("start") LocalDateTime start,
            @Param("endNull") boolean endNull,
            @Param("end") LocalDateTime end,
            Pageable pageable
    );

    // ─── STATISTIQUES SÉCURITÉ ───

    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.action = 'CONNEXION' AND a.type = 'failure' AND a.date >= :since")
    long countFailedLoginsSince(@Param("since") LocalDateTime since);

    @Query("SELECT a.utilisateur, COUNT(a) FROM AuditLog a WHERE a.action = 'CONNEXION' AND a.type = 'failure' AND a.date >= :since GROUP BY a.utilisateur HAVING COUNT(a) >= :threshold")
    List<Object[]> findUsersWithFailedLoginsAboveThreshold(@Param("since") LocalDateTime since, @Param("threshold") long threshold);

    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.cible = 'PATIENT_DATA' AND a.date >= :since")
    long countPatientDataAccessSince(@Param("since") LocalDateTime since);

    @Query("SELECT a.utilisateur, COUNT(a) FROM AuditLog a WHERE a.cible = 'PATIENT_DATA' AND a.date >= :since GROUP BY a.utilisateur ORDER BY COUNT(a) DESC")
    List<Object[]> findTopUsersAccessingPatientData(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.date >= :since")
    long countAllSince(@Param("since") LocalDateTime since);

    /**
     * 📊 Timeline : compte les logs par tranche horaire (pour graphique Recharts)
     * Retourne une liste de [heure (YYYY-MM-DD HH), compte]
     */
    @Query(value = """
            SELECT TO_CHAR(a.date, 'YYYY-MM-DD HH24:00') as hour, COUNT(*) as cnt
            FROM audit_logs a
            WHERE a.date >= :since
            GROUP BY TO_CHAR(a.date, 'YYYY-MM-DD HH24:00')
            ORDER BY hour ASC
            """, nativeQuery = true)
    List<Object[]> getTimelineSince(@Param("since") LocalDateTime since);
}