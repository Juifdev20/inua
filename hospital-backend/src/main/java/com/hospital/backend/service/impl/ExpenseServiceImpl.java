package com.hospital.backend.service.impl;

import com.hospital.backend.dto.ExpenseDTO;
import com.hospital.backend.entity.Expense;
import com.hospital.backend.entity.Expense.ExpenseCategory;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.ExpenseRepository;
import com.hospital.backend.service.ExpenseService;
import com.hospital.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ExpenseServiceImpl implements ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final UserService userService;

    @Override
    public ExpenseDTO createExpense(ExpenseDTO dto, Long userId) {
        log.info("Creating expense for userId: {}, category: {}", userId, dto.getCategory());
        
User createdBy = userService.findById(userId);
        Expense expense = dto.toEntity();
        expense.setCreatedBy(createdBy);
        
        Expense saved = expenseRepository.save(expense);
        log.info("Expense created with ID: {}", saved.getId());
        
        return ExpenseDTO.fromEntity(saved);
    }

    @Override
    public ExpenseDTO getExpenseById(Long id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found: " + id));
        return ExpenseDTO.fromEntity(expense);
    }

    @Override
    public Page<ExpenseDTO> getAllExpenses(Pageable pageable) {
        return expenseRepository.findAll(pageable)
                .map(ExpenseDTO::fromEntity);
    }

    @Override
    public Page<ExpenseDTO> getExpensesByCategory(ExpenseCategory category, Pageable pageable) {
        return expenseRepository.findByCategoryOrderByDateDesc(category, pageable)
                .map(ExpenseDTO::fromEntity);
    }

    @Override
    public List<ExpenseDTO> getRecentExpensesByUser(Long userId, int limit) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, limit);
        return expenseRepository.findByCreatedByIdOrderByCreatedAtDesc(userId, pageable)
                .map(ExpenseDTO::fromEntity)
                .getContent();
    }

    @Override
    public BigDecimal getTotalExpensesBetween(LocalDateTime start, LocalDateTime end) {
        return expenseRepository.sumAmountByDateBetweenAndCategory(start, end, null);
    }

    @Override
    public BigDecimal getTotalExpensesByCategoryAndPeriod(ExpenseCategory category, LocalDateTime start, LocalDateTime end) {
        return expenseRepository.sumAmountByDateBetweenAndCategory(start, end, category);
    }

    @Override
    public BigDecimal getTodayTotal() {
        return expenseRepository.getTodayTotal();
    }

    @Override
    public BigDecimal getMonthlyTotal() {
        return expenseRepository.getCurrentMonthTotal();
    }

    @Override
    public List<Object[]> getExpensesStatsByCategory() {
        return expenseRepository.countByCategory();
    }

    @Override
    public long deleteExpense(Long id) {
        if (!expenseRepository.existsById(id)) {
            throw new RuntimeException("Expense not found: " + id);
        }
        expenseRepository.deleteById(id);
        return 1L;
    }
}

