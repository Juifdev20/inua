package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Verrou de planificateur (multi-instance). Garantit qu'un job @Scheduled ne
 * s'exécute que sur UNE seule instance à la fois, évitant les doublons
 * (emails/alertes/expirations envoyés N fois quand N instances tournent).
 */
@Entity
@Table(name = "scheduler_lock")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchedulerLock {

    @Id
    @Column(name = "lock_name", length = 100)
    private String lockName;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "locked_by", length = 60)
    private String lockedBy;
}
