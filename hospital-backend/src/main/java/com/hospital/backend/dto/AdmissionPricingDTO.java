package com.hospital.backend.dto;

import lombok.*;
import java.math.BigDecimal;

/**
 * DTO pour le calcul des montants lors de l'admission
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdmissionPricingDTO {

    private Long patientId;
    private Long serviceId;
    
    // Montants calculés
    private BigDecimal ficheAmount;
    private BigDecimal consulAmount;
    private BigDecimal totalAmount;
    
    // Informations complémentaires
    private Boolean ficheRequired;  // true si nouvelle fiche à payer
    private Boolean hasActiveFile;  // true si patient a déjà une fiche active
    private String serviceName;
    private String message;        // Message informatif
    
    // Prix unitaires
    private BigDecimal ficheUnitPrice;
    private BigDecimal consulUnitPrice;
}

