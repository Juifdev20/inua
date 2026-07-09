package com.hospital.backend.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPaymentDTO {
    private Long id;
    private Long hospitalId;
    private String hospitalName;
    private String plan;
    private String period;
    private BigDecimal amount;
    private String currency;
    private String method;
    private String status;
    private String reference;
    private String payerName;
    private String payerDetail;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private String confirmedBy;
    private LocalDateTime confirmedAt;
    private String rejectionReason;
    private LocalDateTime createdAt;
}
