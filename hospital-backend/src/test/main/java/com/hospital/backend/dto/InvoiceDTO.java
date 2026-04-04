package com.hospital.backend.dto;

import com.hospital.backend.entity.InvoiceStatus;
import com.hospital.backend.entity.PaymentMethod;
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
public class InvoiceDTO {
    private Long id;
    private String invoiceCode;
    
    @NotNull(message = "Le patient est obligatoire")
    private Long patientId;
    private String patientName;
    
    private Long consultationId;
    private List<InvoiceItemDTO> items;
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private InvoiceStatus status;
    private PaymentMethod paymentMethod;
    private String notes;
    
    private Long createdById;
    private String createdByName;
    
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
