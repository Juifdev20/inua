package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "suppliers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Supplier {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "supplier_code", unique = true, nullable = false)
    private String supplierCode;
    
    @Column(nullable = false)
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "contact_person")
    private String contactPerson;
    
    @Column(name = "phone_number")
    private String phoneNumber;
    
    @Column(name = "email_address")
    private String emailAddress;
    
    @Column(name = "physical_address")
    private String physicalAddress;
    
    @Column(name = "payment_terms")
    private String paymentTerms;
    
    @Column(name = "delivery_time")
    private String deliveryTime;
    
    @Column(name = "is_active")
    private Boolean isActive = true;
    
    @Column(name = "is_preferred")
    private Boolean isPreferred = false;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "supplier", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PharmacyOrder> orders;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (supplierCode == null) {
            supplierCode = "SUP-" + System.currentTimeMillis();
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
