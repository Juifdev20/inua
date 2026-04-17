package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.dto.ExpenseDTO;
import com.hospital.backend.entity.Expense.ExpenseCategory;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.security.CustomUserDetails;
import com.hospital.backend.service.ExpenseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/finance/expenses")
@RequiredArgsConstructor
@Tag(name = "Expenses", description = "Gestion des dépenses")
@SecurityRequirement(name = "bearerAuth")
public class ExpenseController {

    private final ExpenseService expenseService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasRole('FINANCE')")
    @Operation(summary = "Créer une dépense")
    public ResponseEntity<ApiResponse<ExpenseDTO>> createExpense(
            @RequestBody ExpenseDTO expenseDTO,
            Authentication authentication) {
        
        Long userId = getCurrentUserId();
        ExpenseDTO savedExpense = expenseService.createExpense(expenseDTO, userId);
        
        return ResponseEntity.ok(ApiResponse.success("Dépense créée", savedExpense));
    }

    @GetMapping
    @PreAuthorize("hasRole('FINANCE')")
    @Operation(summary = "Liste des dépenses")
    public ResponseEntity<ApiResponse<Page<ExpenseDTO>>> getExpenses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) ExpenseCategory category,
            @RequestParam(required = false) String sortBy,
            Authentication authentication) {
        
        Sort sort = sortBy != null ? Sort.by(sortBy).descending() : Sort.unsorted();
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<ExpenseDTO> expenses;
        if (category != null) {
            expenses = expenseService.getExpensesByCategory(category, pageable);
        } else {
            expenses = expenseService.getAllExpenses(pageable);
        }
        
        return ResponseEntity.ok(ApiResponse.success("Dépenses récupérées", expenses));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('FINANCE')")
    @Operation(summary = "Dépense par ID")
    public ResponseEntity<ApiResponse<ExpenseDTO>> getExpense(@PathVariable Long id) {
        ExpenseDTO expense = expenseService.getExpenseById(id);
        return ResponseEntity.ok(ApiResponse.success("Dépense trouvée", expense));
    }

    @GetMapping("/today-total")
    @PreAuthorize("hasRole('FINANCE')")
    @Operation(summary = "Total des dépenses du jour")
    public ResponseEntity<Map<String, Object>> getTodayTotal() {
        BigDecimal total = expenseService.getTodayTotal();
        return ResponseEntity.ok(Map.of(
            "success", true,
            "total", total,
            "currency", "CDF"
        ));
    }

    @GetMapping("/monthly-total")
    @PreAuthorize("hasRole('FINANCE')")
    @Operation(summary = "Total mensuel")
    public ResponseEntity<Map<String, Object>> getMonthlyTotal() {
        BigDecimal total = expenseService.getMonthlyTotal();
        return ResponseEntity.ok(Map.of(
            "success", true,
            "total", total,
            "currency", "CDF"
        ));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('FINANCE')")
    @Operation(summary = "Statistiques par catégorie")
    public ResponseEntity<Map<String, Object>> getStatsByCategory() {
        List<Object[]> stats = expenseService.getExpensesStatsByCategory();
        return ResponseEntity.ok(Map.of(
            "success", true,
            "content", stats
        ));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('FINANCE')")
    @Operation(summary = "Supprimer une dépense")
    public ResponseEntity<Map<String, Object>> deleteExpense(@PathVariable Long id) {
        expenseService.deleteExpense(id);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Dépense supprimée"
        ));
    }

    private Long getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
                CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
                return userDetails.getUser().getId();
            }
            String username = auth != null ? auth.getName() : null;
            if (username != null) {
                return userRepository.findByUsername(username)
                    .map(User::getId)
                    .orElse(1L);
            }
        } catch (Exception e) {
            // Log error
        }
        return 1L;
    }
}

