package com.hospital.backend.repository;

import com.hospital.backend.entity.SchedulerLock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface SchedulerLockRepository extends JpaRepository<SchedulerLock, String> {

    /**
     * Acquisition atomique du verrou (upsert Postgres). Retourne 1 si le verrou a été
     * pris (ligne créée OU verrou expiré repris), 0 si une autre instance le détient.
     */
    @Modifying
    @Query(value =
        "INSERT INTO scheduler_lock (lock_name, locked_until, locked_by) " +
        "VALUES (:name, :until, :instance) " +
        "ON CONFLICT (lock_name) DO UPDATE " +
        "SET locked_until = :until, locked_by = :instance " +
        "WHERE scheduler_lock.locked_until < :now",
        nativeQuery = true)
    int tryAcquire(@Param("name") String name,
                   @Param("until") LocalDateTime until,
                   @Param("instance") String instance,
                   @Param("now") LocalDateTime now);
}
