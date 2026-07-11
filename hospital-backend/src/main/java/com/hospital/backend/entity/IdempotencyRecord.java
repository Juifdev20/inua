package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Trace des mutations déjà traitées, indexées par une clé d'idempotence fournie
 * par le client (header Idempotency-Key). Permet, lors du rejeu hors-ligne d'une
 * écriture déjà appliquée, de NE PAS la ré-exécuter (ex: éviter un double paiement).
 */
@Entity
@Table(
    name = "idempotency_records",
    uniqueConstraints = @UniqueConstraint(name = "uk_idempotency_tenant_key",
            columnNames = {"tenant_id", "idempotency_key"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IdempotencyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "idempotency_key", nullable = false, length = 80)
    private String idempotencyKey;

    /** Hôpital (tenant) — la clé n'est unique que par tenant. Null pour superadmin. */
    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(name = "endpoint", length = 300)
    private String endpoint;

    @Column(name = "response_status")
    private Integer responseStatus;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
