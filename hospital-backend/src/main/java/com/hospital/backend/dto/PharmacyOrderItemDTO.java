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
public class PharmacyOrderItemDTO {
    private Long id;
    private Long pharmacyOrderId;
    
    @NotNull(message = "Le médicament est obligatoire")
    private Long medicationId;
    
    @NotBlank(message = "Le nom du médicament est obligatoire")
    private String medicationName;
    
    private String medicationCode;
    private String genericName;
    
    @NotNull(message = "La quantité est obligatoire")
    private Integer quantity;
    
    @NotNull(message = "Le prix unitaire est obligatoire")
    private BigDecimal unitPrice;
    
    private BigDecimal totalPrice;
    
    private Integer quantityDispensed;
    private String batchNumber;
    private String expiryDate;
    private String dosageInstructions;
    private Boolean isExternal;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Computed fields
    private Integer remainingQuantity;
    private Boolean isFullyDispensed;
}
