package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "medications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Medication {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "medication_code", unique = true, nullable = false)
    private String medicationCode;
    
    @Column(nullable = false)
    private String name;
    
    @Column(name = "generic_name")
    private String genericName;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private String manufacturer;
    
    private String category;
    
    private String form;
    
    private String strength;
    
    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;
    
    @Column(name = "stock_quantity")
    private Integer stockQuantity;
    
    @Column(name = "minimum_stock")
    private Integer minimumStock;
    
    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;
    
    @Column(name = "is_active")
    private Boolean isActive = true;
    
    @Column(name = "requires_prescription")
    private Boolean requiresPrescription = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (medicationCode == null) {
            medicationCode = "MED-" + System.currentTimeMillis();
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
