package com.hospital.backend.dto;

import com.hospital.backend.entity.Expense;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseDTO {
    
    private Long id;
    
    private LocalDateTime date;
    
    private BigDecimal amount;
    
    private Expense.ExpenseCategory category;
    
    private String description;
    
    private UserDTO createdBy; // Simplified user info
    
    private LocalDateTime createdAt;

    // Static factory methods for mapping
    public static ExpenseDTO fromEntity(Expense expense) {
        if (expense == null) return null;
        UserDTO userDTO = null;
        if (expense.getCreatedBy() != null) {
            userDTO = UserDTO.builder()
                .id(expense.getCreatedBy().getId())
                .prenom(expense.getCreatedBy().getFirstName())
                .nom(expense.getCreatedBy().getLastName())
                .build();
        }
        return ExpenseDTO.builder()
                .id(expense.getId())
                .date(expense.getDate())
                .amount(expense.getAmount())
                .category(expense.getCategory())
                .description(expense.getDescription())
                .createdBy(userDTO)
                .createdAt(expense.getCreatedAt())
                .build();
    }

    public Expense toEntity() {
        return Expense.builder()
                .id(this.id)
                .date(this.date)
                .amount(this.amount)
                .category(this.category)
                .description(this.description)
                .createdAt(this.createdAt)
                .build();
    }

    @Data
    @Builder
    public static class UserDTO {
        private Long id;
        private String prenom;
        private String nom;
    }
}

