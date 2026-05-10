package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultationListDTO {
    private Long id;
    private String consultationCode;
    private String patientName;
    private Long patientId;
    private String patientPhoto;
    private String doctorName;
    private String reasonForVisit;
    private String status;
    private LocalDateTime createdAt;
    
    // Uniquement le montant total, pas les détails des exams
    private Double examTotalAmount;
    private Integer examCount;
    
    // Signes vitaux (Triage Réception)
    private String poids;
    private String temperature;
    private String taille;
    private String tensionArterielle;
    private Long admissionId;
}
