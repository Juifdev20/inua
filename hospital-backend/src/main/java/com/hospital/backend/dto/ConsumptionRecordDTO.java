package com.hospital.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsumptionRecordDTO {

    private Long id;
    private Long patientId;
    private String patientName;
    private String matricule;
    private String fluxType;
    private String description;
    private BigDecimal totalAmount;
    private BigDecimal companyCoverage;
    private BigDecimal patientSurplus;
    private BigDecimal coverageRate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime consumedAt;
}
