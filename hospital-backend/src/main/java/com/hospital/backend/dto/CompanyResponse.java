package com.hospital.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.hospital.backend.entity.SubscriptionStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyResponse {

    private Long id;
    private String name;
    private String address;
    private String phone;
    private String email;
    private String contactPerson;
    private String contractNumber;
    private SubscriptionStatus subscriptionStatus;
    private BigDecimal coverageRate;
    private BigDecimal surplusRate;
    private Long employeesCount;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
