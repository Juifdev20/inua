package com.hospital.backend.service;

import com.hospital.backend.entity.HospitalConfig;
import java.util.Optional;

public interface HospitalConfigService {
    
    /**
     * Récupère la configuration hospitalière actuelle
     */
    Optional<HospitalConfig> getCurrentConfig();
    
    /**
     * Crée ou met à jour la configuration
     */
    HospitalConfig saveOrUpdate(HospitalConfig config, Long userId);
    
    /**
     * Vérifie si une configuration existe
     */
    boolean exists();
    
    /**
     * Initialise la configuration par défaut si elle n'existe pas
     */
    HospitalConfig initializeDefault();
}
