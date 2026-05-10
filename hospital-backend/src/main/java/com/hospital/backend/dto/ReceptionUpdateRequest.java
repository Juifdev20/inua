package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO pour la mise à jour des consultations par la réception
 * Sans validations strictes @NotNull pour permettre les mises à jour partielles
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceptionUpdateRequest {
    
    private Long patientId;
    private Long doctorId;
    private Long serviceId;
    
    // Paramètres vitaux
    private Double taille;
    private Double poids;
    private Double temperature;
    private String tensionArterielle;
    
    // Infos médicales
    private String reasonForVisit;
    private String symptomes;
    
    // Paiement examens
    private BigDecimal examAmountPaid;
    
    // Statut
    private String status;
}
