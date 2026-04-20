package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "revenues")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = {"createdBy", "referenceInvoice"})
@ToString(exclude = {"createdBy", "referenceInvoice"})
public class Revenue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime date;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RevenueSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "currency", nullable = false)
    private Currency currency = Currency.USD;  // Par défaut en USD

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reference_invoice_id")
    private Invoice referenceInvoice;

    @Column(name = "receipt_number", unique = true)
    private String receiptNumber;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (date == null) {
            date = now;
        }
        if (receiptNumber == null) {
            receiptNumber = generateReceiptNumber();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    private String generateReceiptNumber() {
        return "REC-" + System.currentTimeMillis();
    }

    public enum RevenueSource {
        ADMISSION,
        LABORATOIRE,
        PHARMACIE,
        CONSULTATION,
        HOSPITALISATION,
        AUTRE
    }
}
