package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO pour envoyer les résultats de laboratoire au médecin
 * Contient uniquement des données primitives (pas d'entités Hibernate)
 * pour éviter les LazyInitializationException
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabTestResponseDTO {
    private Long id;
    private String testCode;
    private String testName;
    private String testType;
    private String results;
    private String interpretation;
    private String unit;
    private String normalRange;
    private String status;
    private String priority;
    
    // IDs uniquement (pas d'objets entiers)
    private Long consultationId;
    private Long patientId;
    private String patientName;
    private Long requestedById;
    private String requestedByName;
    private Long processedById;
    private String processedByName;
    private Long doctorRecipientId;
    private String doctorRecipientName;
    
    // Dates
    private LocalDateTime requestedAt;
    private LocalDateTime processedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Finance
    private boolean fromFinance;
}
