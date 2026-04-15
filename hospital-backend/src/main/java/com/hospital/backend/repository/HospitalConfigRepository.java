package com.hospital.backend.repository;

import com.hospital.backend.entity.HospitalConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HospitalConfigRepository extends JpaRepository<HospitalConfig, Long> {
    
    /**
     * Récupère la configuration active (la première, car il n'y en a qu'une)
     */
    Optional<HospitalConfig> findFirstByOrderByIdAsc();
    
    /**
     * Vérifie si une configuration existe déjà
     */
    boolean existsById(Long id);
}
