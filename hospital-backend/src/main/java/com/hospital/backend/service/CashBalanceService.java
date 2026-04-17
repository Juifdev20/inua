package com.hospital.backend.service;

import com.hospital.backend.entity.Revenue;
import com.hospital.backend.entity.Expense;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

public interface CashBalanceService {
    
    Map<String, BigDecimal> getBalanceBySource();
    
    BigDecimal getBalanceBySource(Revenue.RevenueSource source);
    
    BigDecimal getTotalBalance();
    
    boolean hasEnoughBalance(Revenue.RevenueSource source, BigDecimal amount);
    
    void deductFromSource(Revenue.RevenueSource source, BigDecimal amount, String description);
    
    Map<String, Object> getCashFlowSummary();
}
