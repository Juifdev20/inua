package com.hospital.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Résumé de consommation par patient/admission pour la feuille mensuelle.
 * Chaque flux (CONSULTATION, LABO, PHARMACIE) est affiché séparément,
 * avec 0 si le flux n'a pas encore été consommé.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientConsumptionSummaryDTO {

    private Long admissionId;
    private Long patientId;
    private String patientName;
    private String matricule;
    private String admissionStatus;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime admissionDate;

    private BigDecimal coverageRate;

    // ─── Montants par flux (0 si pas encore consommé) ─────────────────────────
    private BigDecimal consultationAmount;
    private BigDecimal laboAmount;
    private BigDecimal pharmacieAmount;

    // ─── Couverture par flux ───────────────────────────────────────────────────
    private BigDecimal consultationCoverage;
    private BigDecimal laboCoverage;
    private BigDecimal pharmacieCoverage;

    // ─── Ticket modeste par flux ──────────────────────────────────────────────
    private BigDecimal consultationSurplus;
    private BigDecimal laboSurplus;
    private BigDecimal pharmacieSurplus;

    // ─── Totaux ───────────────────────────────────────────────────────────────
    private BigDecimal totalAmount;
    private BigDecimal totalCoverage;
    private BigDecimal totalSurplus;
}
