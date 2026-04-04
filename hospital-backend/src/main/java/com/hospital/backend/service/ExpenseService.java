package com.hospital.backend.service;

import com.hospital.backend.dto.ExpenseDTO;
import com.hospital.backend.entity.Expense.ExpenseCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface ExpenseService {
    
    ExpenseDTO createExpense(ExpenseDTO expenseDTO, Long userId);

    ExpenseDTO getExpenseById(Long id);

    Page<ExpenseDTO> getAllExpenses(Pageable pageable);

    Page<ExpenseDTO> getExpensesByCategory(ExpenseCategory category, Pageable pageable);

    List<ExpenseDTO> getRecentExpensesByUser(Long userId, int limit);

    BigDecimal getTotalExpensesBetween(LocalDateTime start, LocalDateTime end);

    BigDecimal getTotalExpensesByCategoryAndPeriod(ExpenseCategory category, LocalDateTime start, LocalDateTime end);

    BigDecimal getTodayTotal();

    BigDecimal getMonthlyTotal();

    List<Object[]> getExpensesStatsByCategory();

    long deleteExpense(Long id);
}

