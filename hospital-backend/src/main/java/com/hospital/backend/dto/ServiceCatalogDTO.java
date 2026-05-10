package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * ★ DTO pour le catalogue des services et examens
 * Utilisé par le portail patient pour afficher les prestations disponibles
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceCatalogDTO {
    
    private Long id;
    private String name;
    private String code;
    private String description;
    private BigDecimal price;
    private String currency;
    private String category;
    private String type; // "SERVICE" ou "EXAMEN"
    private String icon;
    private Integer durationMinutes;
    private String unit; // Pour les examens (ex: g/L, mmol/L)
    private String resultDelay; // Délai de résultat pour les examens
    private Boolean active;
}
