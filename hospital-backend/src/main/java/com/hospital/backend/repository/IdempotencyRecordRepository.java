package com.hospital.backend.repository;

import com.hospital.backend.entity.IdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, Long> {

    Optional<IdempotencyRecord> findByTenantIdAndIdempotencyKey(Long tenantId, String idempotencyKey);

    boolean existsByTenantIdAndIdempotencyKey(Long tenantId, String idempotencyKey);
}
