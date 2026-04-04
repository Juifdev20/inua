package com.hospital.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDTO {
    private Long id;
    private String employeeCode;
    
    @NotNull(message = "L'utilisateur est obligatoire")
    private Long userId;
    private UserDTO user;
    
    private String department;
    private String position;
    private LocalDate hireDate;
    private BigDecimal salary;
    private String contractType;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String bankAccount;
    private String nationalId;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
