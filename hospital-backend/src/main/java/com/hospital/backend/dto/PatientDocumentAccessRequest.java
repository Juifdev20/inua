package com.hospital.backend.dto;

import lombok.Data;

/**
 * DTO pour la requête d'accès à un document médical sécurisé
 * Le patient doit fournir son mot de passe pour déverrouiller l'accès
 */
@Data
public class PatientDocumentAccessRequest {
    
    /**
     * Mot de passe du compte patient pour vérification
     * (nécessaire pour des raisons de sécurité médicale)
     */
    private String password;
    
    /**
     * Optionnel : raison de la consultation (audit trail)
     */
    private String reason;
}
