package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "pharmacy_order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"pharmacyOrder", "medication"})
@EqualsAndHashCode(exclude = {"pharmacyOrder", "medication"})
public class PharmacyOrderItem {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pharmacy_order_id", nullable = false)
    @JsonIgnoreProperties({"items"})
    private PharmacyOrder pharmacyOrder;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medication_id", nullable = false)
    @JsonIgnoreProperties({"orderItems"})
    private Medication medication;
    
    @Column(nullable = false)
    private Integer quantity;
    
    @Column(name = "unit_price", precision = 10, scale = 2, nullable = false)
    private BigDecimal unitPrice;
    
    @Column(name = "total_price", precision = 19, scale = 2)
    private BigDecimal totalPrice;
    
    @Column(name = "quantity_dispensed")
    private Integer quantityDispensed;
    
    @Column(name = "batch_number")
    private String batchNumber;
    
    @Column(name = "expiry_date")
    private String expiryDate;
    
    @Column(columnDefinition = "TEXT")
    private String dosageInstructions;
    
    @Column(name = "is_external")
    private Boolean isExternal = false;
    
    @Column(name = "created_at")
    private java.time.LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private java.time.LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = java.time.LocalDateTime.now();
        updatedAt = java.time.LocalDateTime.now();
        if (totalPrice == null) {
            totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));
        }
        if (quantityDispensed == null) {
            quantityDispensed = 0;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = java.time.LocalDateTime.now();
        // Recalculate total price if quantity or unit price changed
        if (quantity != null && unitPrice != null) {
            totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));
        }
    }
}
