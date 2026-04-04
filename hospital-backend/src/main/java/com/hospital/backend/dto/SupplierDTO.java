package com.hospital.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupplierDTO {
    private Long id;
    private String supplierCode;
    
    @NotBlank(message = "Le nom du fournisseur est obligatoire")
    private String name;
    
    private String description;
    private String contactPerson;
    private String phoneNumber;
    private String emailAddress;
    private String physicalAddress;
    private String paymentTerms;
    private String deliveryTime;
    
    private Boolean isActive;
    private Boolean isPreferred;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Computed fields
    private Long totalOrders;
    private LocalDateTime lastOrderDate;
}
