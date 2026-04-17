package com.hospital.backend.controller;

import com.hospital.backend.service.ExpenseService;
import com.hospital.backend.service.RevenueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/finance/cashflow")
@RequiredArgsConstructor
@Tag(name = "CashFlow", description = "Vue consolidée des flux financiers (entrées vs dépenses)")
@SecurityRequirement(name = "bearerAuth")
public class CashFlowController {

    private final RevenueService revenueService;
    private final ExpenseService expenseService;

    @GetMapping("/summary")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Résumé consolidé Entrées vs Dépenses")
    public ResponseEntity<Map<String, Object>> getCashFlowSummary(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        // Default to current month if no dates provided
        LocalDateTime start = startDate != null
                ? LocalDate.parse(startDate, DateTimeFormatter.ISO_DATE).atStartOfDay()
                : LocalDate.now().withDayOfMonth(1).atStartOfDay();

        LocalDateTime end = endDate != null
                ? LocalDate.parse(endDate, DateTimeFormatter.ISO_DATE).atTime(23, 59, 59)
                : LocalDateTime.now();

        // Get totals
        BigDecimal totalRevenues = revenueService.getTotalRevenuesBetween(start, end);
        BigDecimal totalExpenses = expenseService.getTotalExpensesBetween(start, end);
        BigDecimal netCashFlow = totalRevenues.subtract(totalExpenses);

        // Today's snapshot
        BigDecimal todayRevenues = revenueService.getTodayTotal();
        BigDecimal todayExpenses = expenseService.getTodayTotal();
        BigDecimal todayNet = todayRevenues.subtract(todayExpenses);

        // Monthly snapshot
        BigDecimal monthlyRevenues = revenueService.getMonthlyTotal();
        BigDecimal monthlyExpenses = expenseService.getMonthlyTotal();
        BigDecimal monthlyNet = monthlyRevenues.subtract(monthlyExpenses);

        Map<String, Object> summary = new HashMap<>();
        summary.put("success", true);
        summary.put("currency", "CDF");

        // Period data
        summary.put("period", Map.of(
                "startDate", start.toLocalDate().toString(),
                "endDate", end.toLocalDate().toString()
        ));

        summary.put("periodTotals", Map.of(
                "revenues", totalRevenues,
                "expenses", totalExpenses,
                "netCashFlow", netCashFlow,
                "isPositive", netCashFlow.compareTo(BigDecimal.ZERO) >= 0
        ));

        summary.put("today", Map.of(
                "revenues", todayRevenues,
                "expenses", todayExpenses,
                "net", todayNet
        ));

        summary.put("month", Map.of(
                "revenues", monthlyRevenues,
                "expenses", monthlyExpenses,
                "net", monthlyNet
        ));

        return ResponseEntity.ok(summary);
    }

    @GetMapping("/balance")
    @PreAuthorize("hasRole('FINANCE') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Solde de caisse temps réel")
    public ResponseEntity<Map<String, Object>> getCashBalance() {
        // Simple balance calculation: all-time revenues - all-time expenses
        BigDecimal allTimeRevenues = revenueService.getTotalRevenuesBetween(
                LocalDateTime.of(2000, 1, 1, 0, 0),
                LocalDateTime.now()
        );
        BigDecimal allTimeExpenses = expenseService.getTotalExpensesBetween(
                LocalDateTime.of(2000, 1, 1, 0, 0),
                LocalDateTime.now()
        );

        BigDecimal balance = allTimeRevenues.subtract(allTimeExpenses);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "balance", balance,
                "allTimeRevenues", allTimeRevenues,
                "allTimeExpenses", allTimeExpenses,
                "currency", "CDF",
                "status", balance.compareTo(BigDecimal.ZERO) > 0 ? "POSITIVE" : "NEGATIVE"
        ));
    }
}
