package com.hospital.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicationDTO {
    private Long id;
    private String medicationCode;
    
    @NotBlank(message = "Le nom du médicament est obligatoire")
    private String name;
    
    private String genericName;
    private String description;
    private String manufacturer;
    private String category;
    private String form;
    private String strength;
    
    @NotNull(message = "Le prix unitaire est obligatoire")
    private BigDecimal unitPrice;
    
    private Integer stockQuantity;
    private Integer minimumStock;
    private LocalDateTime expiryDate;
    private Boolean isActive;
    private Boolean requiresPrescription;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
