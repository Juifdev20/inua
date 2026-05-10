package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.LocalDate;

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
    
    @Column(name = "manufacturer")
    private String manufacturer;
    
    @Column(name = "supplier")
    private String supplier;
    
    private String category;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "form")
    private MedicationForm form;
    
    private String strength;
    
    @Column(name = "price", precision = 10, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(name = "purchase_currency")
    private Currency purchaseCurrency;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "sale_currency")
    private Currency saleCurrency;
    
    @Column(name = "stock_quantity")
    private Integer stockQuantity;
    
    @Column(name = "minimum_stock")
    private Integer minimumStock;
    
    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;
    
    @Column(name = "purchase_date")
    private LocalDate purchaseDate;
    
    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Builder.Default
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
        // Normaliser le nom pour faciliter la recherche
        if (name != null) {
            name = name.trim().toLowerCase();
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        // Normaliser le nom pour faciliter la recherche
        if (name != null) {
            name = name.trim().toLowerCase();
        }
    }
    
    // ===== CALCULS FINANCIERS =====
    
    /**
     * Calcule le profit potentiel total pour tout le stock
     * @return (unitPrice - price) * stockQuantity
     */
    public BigDecimal getPotentialProfit() {
        if (unitPrice == null || price == null || stockQuantity == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal profitPerUnit = unitPrice.subtract(price);
        return profitPerUnit.multiply(BigDecimal.valueOf(stockQuantity));
    }
    
    /**
     * Calcule la valeur d'achat totale du stock
     * @return price * stockQuantity
     */
    public BigDecimal getTotalPurchaseValue() {
        if (price == null || stockQuantity == null) {
            return BigDecimal.ZERO;
        }
        return price.multiply(BigDecimal.valueOf(stockQuantity));
    }
    
    /**
     * Calcule la valeur de vente totale du stock
     * @return unitPrice * stockQuantity
     */
    public BigDecimal getTotalSaleValue() {
        if (unitPrice == null || stockQuantity == null) {
            return BigDecimal.ZERO;
        }
        return unitPrice.multiply(BigDecimal.valueOf(stockQuantity));
    }
    
    /**
     * Calcule le pourcentage de marge
     * @return ((unitPrice - price) / price) * 100
     */
    public BigDecimal getMarginPercentage() {
        if (price == null || unitPrice == null || price.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal margin = unitPrice.subtract(price);
        return margin.divide(price, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
    }
    
    /**
     * Vérifie si le médicament est rentable (marge > 5%)
     * @return true si la marge est supérieure à 5%
     */
    public boolean isProfitable() {
        return getMarginPercentage().compareTo(BigDecimal.valueOf(5)) > 0;
    }
    
    /**
     * Vérifie si le médicament est vendu à perte ou à marge très faible
     * @return true si la marge est inférieure ou égale à 5%
     */
    public boolean hasLowMargin() {
        return getMarginPercentage().compareTo(BigDecimal.valueOf(5)) <= 0;
    }
}
