package com.hospital.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PharmacyOrderDTO {
    private Long id;
    private String orderCode;
    
    private Long supplierId;
    private String supplierName;
    
    private Long patientId;
    private String patientName;
    private String customerName;
    private String patientCode;
    
    @NotNull(message = "Le statut est obligatoire")
    private String status;
    
    @NotNull(message = "Le type de commande est obligatoire")
    private String orderType;
    
    private BigDecimal totalAmount;
    private BigDecimal amountPaid;
    private String paymentMethod;
    private String paymentReference;
    
    private Long createdBy;
    private String createdByName;
    
    private Long validatedBy;
    private String validatedByName;
    
    private LocalDateTime validatedAt;
    private LocalDateTime dispensedAt;
    
    private String notes;
    private String doctorNotes;
    
    private Boolean isExternalPrescription;
    private String externalPrescriptionNumber;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    private Boolean archived;
    
    private List<PharmacyOrderItemDTO> items;
    
    // Computed fields
    private BigDecimal remainingAmount;
    private Boolean isFullyPaid;
    private Boolean isFullyDispensed;
}
