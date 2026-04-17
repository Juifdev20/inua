package com.hospital.backend.dto;

import com.hospital.backend.entity.PaymentMethod;
import com.hospital.backend.entity.Revenue;
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
public class RevenueDTO {

    private Long id;
    private LocalDateTime date;
    private BigDecimal amount;
    private Revenue.RevenueSource source;
    private PaymentMethod paymentMethod;
    private Long referenceInvoiceId;
    private String receiptNumber;
    private String description;
    private UserDTO createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Invoice info if linked
    private String patientName;
    private String invoiceCode;

    @Data
    @Builder
    public static class UserDTO {
        private Long id;
        private String firstName;
        private String lastName;
    }

    // Static factory method: Entity -> DTO
    public static RevenueDTO fromEntity(Revenue revenue) {
        if (revenue == null) return null;

        UserDTO userDTO = null;
        if (revenue.getCreatedBy() != null) {
            userDTO = UserDTO.builder()
                    .id(revenue.getCreatedBy().getId())
                    .firstName(revenue.getCreatedBy().getFirstName())
                    .lastName(revenue.getCreatedBy().getLastName())
                    .build();
        }

        String patientName = null;
        String invoiceCode = null;
        Long refInvoiceId = null;

        if (revenue.getReferenceInvoice() != null) {
            refInvoiceId = revenue.getReferenceInvoice().getId();
            invoiceCode = revenue.getReferenceInvoice().getInvoiceCode();
            if (revenue.getReferenceInvoice().getPatient() != null) {
                patientName = revenue.getReferenceInvoice().getPatient().getFirstName() + " " +
                        revenue.getReferenceInvoice().getPatient().getLastName();
            }
        }

        return RevenueDTO.builder()
                .id(revenue.getId())
                .date(revenue.getDate())
                .amount(revenue.getAmount())
                .source(revenue.getSource())
                .paymentMethod(revenue.getPaymentMethod())
                .referenceInvoiceId(refInvoiceId)
                .receiptNumber(revenue.getReceiptNumber())
                .description(revenue.getDescription())
                .createdBy(userDTO)
                .createdAt(revenue.getCreatedAt())
                .updatedAt(revenue.getUpdatedAt())
                .patientName(patientName)
                .invoiceCode(invoiceCode)
                .build();
    }

    // Convert to Entity (for create/update)
    public Revenue toEntity() {
        return Revenue.builder()
                .id(this.id)
                .date(this.date)
                .amount(this.amount)
                .source(this.source)
                .paymentMethod(this.paymentMethod)
                .description(this.description)
                .createdAt(this.createdAt)
                .updatedAt(this.updatedAt)
                .build();
    }
}
