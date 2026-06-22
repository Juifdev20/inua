package com.hospital.backend.repository;

import com.hospital.backend.entity.EmailLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {

    Page<EmailLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<EmailLog> findByStatusAndRetryCountLessThanOrderByCreatedAtAsc(
            String status, int maxRetries);

    @Query("SELECT e.status, COUNT(e) FROM EmailLog e GROUP BY e.status")
    List<Object[]> countByStatus();

    @Query("SELECT COUNT(e) FROM EmailLog e WHERE e.status = 'FAILED' AND e.retryCount >= e.maxRetries")
    long countPermanentlyFailed();
}
