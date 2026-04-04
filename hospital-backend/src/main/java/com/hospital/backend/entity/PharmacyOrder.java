package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "pharmacy_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"supplier", "patient", "items", "createdBy", "validatedBy"})
@EqualsAndHashCode(exclude = {"supplier", "patient", "items", "createdBy", "validatedBy"})
public class PharmacyOrder {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "order_code", unique = true, nullable = false)
    private String orderCode;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"orders"})
    private Supplier supplier;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    @JsonIgnoreProperties({"consultations", "medicalRecords", "user", "createdBy"})
    private Patient patient;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PharmacyOrderStatus status;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false)
    private PharmacyOrderType orderType;
    
    @Column(name = "total_amount", precision = 19, scale = 2)
    private BigDecimal totalAmount;
    
    @Column(name = "amount_paid", precision = 19, scale = 2)
    private BigDecimal amountPaid;
    
    @Column(name = "payment_method")
    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod;
    
    @Column(name = "payment_reference")
    private String paymentReference;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnoreProperties({"password", "role", "permissions", "patient"})
    private User createdBy;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "validated_by")
    @JsonIgnoreProperties({"password", "role", "permissions", "patient"})
    private User validatedBy;
    
    @Column(name = "validated_at")
    private LocalDateTime validatedAt;
    
    @Column(name = "dispensed_at")
    private LocalDateTime dispensedAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispensed_by")
    @JsonIgnoreProperties({"password", "role", "permissions", "patient"})
    private User dispensedBy;
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    @Column(name = "doctor_notes", columnDefinition = "TEXT")
    private String doctorNotes;
    
    @Column(name = "is_external_prescription")
    private Boolean isExternalPrescription = false;
    
    @Column(name = "external_prescription_number")
    private String externalPrescriptionNumber;
    
    @Column(name = "customer_name")
    private String customerName;
    
    @Column(name = "archived")
    private Boolean archived = false;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Version
    private Long version;
    
    @OneToMany(mappedBy = "pharmacyOrder", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PharmacyOrderItem> items;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (orderCode == null) {
            orderCode = "ORD-" + System.currentTimeMillis();
        }
        if (status == null) {
            status = PharmacyOrderStatus.EN_ATTENTE;
        }
        if (totalAmount == null) {
            totalAmount = BigDecimal.ZERO;
        }
        if (amountPaid == null) {
            amountPaid = BigDecimal.ZERO;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
