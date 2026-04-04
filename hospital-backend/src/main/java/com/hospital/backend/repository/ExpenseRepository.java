package com.hospital.backend.repository;

import com.hospital.backend.entity.Expense;
import com.hospital.backend.entity.Expense.ExpenseCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    // Find by category
Page<Expense> findByCategoryOrderByDateDesc(ExpenseCategory category, Pageable pageable);

List<Expense> findByCategoryOrderByDateDesc(ExpenseCategory category);

    // Recent expenses
    Page<Expense> findByCreatedByIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    // Sum by period and category
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.date BETWEEN :startDate AND :endDate AND e.category = :category")
    BigDecimal sumAmountByDateBetweenAndCategory(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            @Param("category") ExpenseCategory category);

    // Daily total
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE CAST(e.date AS date) = CURRENT_DATE")
    BigDecimal getTodayTotal();

    // Monthly total
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE YEAR(e.date) = YEAR(CURRENT_DATE) AND MONTH(e.date) = MONTH(CURRENT_DATE)")
    BigDecimal getCurrentMonthTotal();

    // Dashboard stats: total pending by category
    @Query("SELECT e.category, COALESCE(COUNT(e), 0) FROM Expense e GROUP BY e.category")
    List<Object[]> countByCategory();
}

