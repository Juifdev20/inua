package com.hospital.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.hospital.backend.entity.Admission;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdmissionDTO {

    private Long id;
    
    @JsonProperty("patientId")
    private Long patientId;
    
    @JsonProperty("patientName")
    private String patientName;
    
    @JsonProperty("doctorId")
    private Long doctorId;
    
    @JsonProperty("doctorName")
    private String doctorName;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @JsonProperty("admissionDate")
    private LocalDateTime admissionDate;

    // --- SIGNES VITAUX (TRIAGE) ---
    private String poids;
    private String temperature;
    private String taille;
    private String tensionArterielle;
    
    @JsonProperty("reasonForVisit")
    private String reasonForVisit; // motif
    
    private String symptoms;
    private String notes;

    @JsonProperty("status")
    private Admission.AdmissionStatus status;

    @JsonProperty("registrationFee")
    private BigDecimal registrationFee;

    @JsonProperty("serviceFee")
    private BigDecimal serviceFee;

    private BigDecimal totalAmount;

    // --- ABONNÉS (Slice 1) ---
    @JsonProperty("isAbonne")
    private Boolean isAbonne;

    @JsonProperty("companyId")
    private Long companyId;

    @JsonProperty("companyName")
    private String companyName;

    @JsonProperty("matricule")
    private String matricule;

    // --- SURPLUS / TICKET MODESTE (Slice 2) ---
    @JsonProperty("coverageRate")
    private BigDecimal coverageRate;

    @JsonProperty("companyCoverage")
    private BigDecimal companyCoverage;

    @JsonProperty("patientSurplus")
    private BigDecimal patientSurplus;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
