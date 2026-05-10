package com.hospital.backend.service.impl;

import com.hospital.backend.entity.Revenue;
import com.hospital.backend.entity.Expense;
import com.hospital.backend.repository.RevenueRepository;
import com.hospital.backend.repository.ExpenseRepository;
import com.hospital.backend.service.CashBalanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CashBalanceServiceImpl implements CashBalanceService {

    private final RevenueRepository revenueRepository;
    private final ExpenseRepository expenseRepository;

    @Override
    public Map<String, BigDecimal> getBalanceBySource() {
        Map<String, BigDecimal> balances = new HashMap<>();
        
        for (Revenue.RevenueSource source : Revenue.RevenueSource.values()) {
            balances.put(source.name(), getBalanceBySource(source));
        }
        
        return balances;
    }

    @Override
    public BigDecimal getBalanceBySource(Revenue.RevenueSource source) {
        // Calculate total revenues for this source
        BigDecimal totalRevenues = revenueRepository.sumAmountBySource(source);
        if (totalRevenues == null) {
            totalRevenues = BigDecimal.ZERO;
        }
        
        // Calculate total expenses for the corresponding category
        Expense.ExpenseCategory expenseCategory = mapSourceToExpenseCategory(source);
        BigDecimal totalExpenses = BigDecimal.ZERO;
        
        if (expenseCategory != null) {
            totalExpenses = expenseRepository.sumAmountByCategory(expenseCategory);
            if (totalExpenses == null) {
                totalExpenses = BigDecimal.ZERO;
            }
        }
        
        return totalRevenues.subtract(totalExpenses);
    }

    @Override
    public BigDecimal getTotalBalance() {
        BigDecimal totalRevenues = revenueRepository.sumTotalAmount();
        BigDecimal totalExpenses = expenseRepository.sumTotalAmount();
        
        if (totalRevenues == null) totalRevenues = BigDecimal.ZERO;
        if (totalExpenses == null) totalExpenses = BigDecimal.ZERO;
        
        return totalRevenues.subtract(totalExpenses);
    }

    @Override
    public boolean hasEnoughBalance(Revenue.RevenueSource source, BigDecimal amount) {
        BigDecimal balance = getBalanceBySource(source);
        return balance.compareTo(amount) >= 0;
    }

    @Override
    @Transactional
    public void deductFromSource(Revenue.RevenueSource source, BigDecimal amount, String description) {
        log.info("Deducting {} from source {}: {}", amount, source, description);
        
        // The deduction happens automatically because we're creating an expense
        // that corresponds to this revenue source
        // The balance calculation is dynamic based on revenues minus expenses
    }

    @Override
    public Map<String, Object> getCashFlowSummary() {
        Map<String, Object> summary = new HashMap<>();
        
        // Total balances
        summary.put("totalBalance", getTotalBalance());
        summary.put("balancesBySource", getBalanceBySource());
        
        // Daily summary
        LocalDate today = LocalDate.now();
        BigDecimal todayRevenues = revenueRepository.sumAmountByDate(today);
        BigDecimal todayExpenses = expenseRepository.sumAmountByDate(today.atStartOfDay(), today.plusDays(1).atStartOfDay());
        
        if (todayRevenues == null) todayRevenues = BigDecimal.ZERO;
        if (todayExpenses == null) todayExpenses = BigDecimal.ZERO;
        
        summary.put("todayRevenues", todayRevenues);
        summary.put("todayExpenses", todayExpenses);
        summary.put("todayNet", todayRevenues.subtract(todayExpenses));
        
        return summary;
    }

    private Expense.ExpenseCategory mapSourceToExpenseCategory(Revenue.RevenueSource source) {
        return switch (source) {
            case ADMISSION -> Expense.ExpenseCategory.ADMISSION;
            case LABORATOIRE -> Expense.ExpenseCategory.LABORATOIRE;
            case PHARMACIE -> Expense.ExpenseCategory.PHARMACIE;
            case CONSULTATION -> Expense.ExpenseCategory.ADMISSION; // Consultations grouped with admissions
            case HOSPITALISATION -> Expense.ExpenseCategory.ADMISSION; // Hospitalisation grouped with admissions
            case AUTRE -> Expense.ExpenseCategory.AUTRE;
        };
    }

    public Revenue.RevenueSource mapExpenseCategoryToSource(Expense.ExpenseCategory category) {
        return switch (category) {
            case ADMISSION -> Revenue.RevenueSource.ADMISSION;
            case LABORATOIRE -> Revenue.RevenueSource.LABORATOIRE;
            case PHARMACIE -> Revenue.RevenueSource.PHARMACIE;
            case ADMINISTRATION -> Revenue.RevenueSource.AUTRE;
            case AUTRE -> Revenue.RevenueSource.AUTRE;
        };
    }
}
