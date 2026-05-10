package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceptionStatsDTO {
    
    private Integer totalPending;
    private Double totalAmount;
    private Integer todayProcessed;
    private Double todayRevenue;
}
