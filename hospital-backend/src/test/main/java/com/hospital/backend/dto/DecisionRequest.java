package com.hospital.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;
import org.springframework.format.annotation.DateTimeFormat;

@Data
public class DecisionRequest {
    // Correspond au 'status' envoyé par la modal (VALIDATED, CANCELLED, EN_ATTENTE)
    private String status;

    // Correspond au 'decisionNote' envoyé par la modal (Message au patient)
    private String decisionNote;

    // Optionnel : On utilise @DateTimeFormat pour assurer la lecture du format ISO de React
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime proposedNewDate;
}