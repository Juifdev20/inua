package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO pour les données de rapport de ventes par jour
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesEvolutionDTO {
    private String day;           // Jour de la semaine (Lun, Mar, etc.) ou date
    private BigDecimal sales;     // Montant des ventes
    private Integer orders;       // Nombre de commandes
}
