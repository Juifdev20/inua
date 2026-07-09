package com.hospital.backend.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionSettingsDTO {
    private String currency;
    private BigDecimal standardMonthlyPrice;
    private BigDecimal premiumMonthlyPrice;
    private BigDecimal enterpriseMonthlyPrice;
    private BigDecimal annualDiscountPercent;
    private Integer trialDays;
    private Integer graceDays;
    private Integer alertDaysBefore;
    private Boolean autoApprove;
}
