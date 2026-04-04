package com.hospital.backend.repository; // <-- Doit être repository, pas dto

import com.hospital.backend.entity.Signalement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SignalementRepository extends JpaRepository<Signalement, Long> {
}