package com.hospital.backend.repository;

import com.hospital.backend.entity.BackupHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BackupHistoryRepository extends JpaRepository<BackupHistory, Long> {
    List<BackupHistory> findAllByOrderByCreatedAtDesc();
    List<BackupHistory> findTop10ByOrderByCreatedAtDesc();
    long countByStatus(String status);
}
