package com.hospital.backend.dto;

import com.hospital.backend.entity.Currency;
import com.hospital.backend.entity.MedicationForm;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicationDTO {
    private Long id;
    
    @NotBlank(message = "Le code du médicament est obligatoire")
    private String medicationCode;
    
    @NotBlank(message = "Le nom du médicament est obligatoire")
    private String name;
    
    private String genericName;
    private String description;
    private String manufacturer;
    private String supplier;
    private String category;
    
    private MedicationForm form;
    private String strength;
    
    @NotNull(message = "Le prix d'achat est obligatoire")
    @Positive(message = "Le prix d'achat doit être positif")
    private BigDecimal price;

    private Currency purchaseCurrency;

    @NotNull(message = "Le prix de vente est obligatoire")
    @Positive(message = "Le prix de vente doit être positif")
    private BigDecimal unitPrice;

    private Currency saleCurrency;
    
    @NotNull(message = "La quantité en stock est obligatoire")
    @Positive(message = "La quantité en stock doit être positive")
    private Integer stockQuantity;
    
    private Integer minimumStock;
    private LocalDateTime expiryDate;
    private LocalDate purchaseDate;
    private Currency devise;  // Gardé pour compatibilité (déprécié, utiliser purchaseCurrency)
    private Boolean isActive;
    private Boolean requiresPrescription;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
