package com.hospital.backend.dto;

import com.hospital.backend.entity.InvoiceItemType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceItemDTO {
    private Long id;
    
    @NotBlank(message = "La description est obligatoire")
    private String description;
    
    // ★ ALIAS pour compatibilité frontend (CaissePharmacie attend 'name')
    public String getName() {
        return this.description;
    }
    
    private InvoiceItemType itemType;
    
    @NotNull(message = "La quantité est obligatoire")
    private Integer quantity;
    
    @NotNull(message = "Le prix unitaire est obligatoire")
    private BigDecimal unitPrice;
    
    // ★ ALIAS pour compatibilité frontend (CaissePharmacie attend 'price')
    public BigDecimal getPrice() {
        return this.unitPrice;
    }
    
    private BigDecimal totalPrice;
}
