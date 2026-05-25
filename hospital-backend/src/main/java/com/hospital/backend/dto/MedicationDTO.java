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
    private Integer joursAvantAlerte;
    private LocalDate expiryDate;
    private LocalDate purchaseDate;
    private Currency devise;  // Gardé pour compatibilité (déprécié, utiliser purchaseCurrency)
    private Boolean isActive;
    private Boolean requiresPrescription;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Taux de change pour conversion devise (ex: 2500.00 si 1 USD = 2500 CDF)
     * Utilisé lors de la création de la transaction finance
     */
    private BigDecimal tauxChange;

    /**
     * Indique si la mise à jour de stock correspond à un achat (créera une transaction finance)
     * true = achat (nouveau stock acheté), false = correction d'inventaire
     */
    @Builder.Default
    private Boolean isStockPurchase = false;

    /**
     * Quantité ajoutée lors d'un achat (différence entre ancienne et nouvelle quantité)
     * Utilisé pour calculer le montant total de l'achat
     */
    private Integer quantityAdded;

    /**
     * Quantité retirée lors d'une sortie manuelle
     */
    private Integer quantityRemoved;

    /**
     * Action de stock: ADD (ajout/achat) ou REMOVE (retrait/sortie)
     */
    private String stockAction; // "ADD" ou "REMOVE"

    /**
     * Motif du mouvement de stock (raison de l'ajout/retrait)
     */
    private String motif;

    /**
     * Numéro de lot (pour les achats/entrées de stock)
     */
    private String lotNumber;

    /**
     * URL de la pièce justificative uploadée (facture, bon de livraison)
     * Transmis à la finance pour vérification avant validation
     */
    private String justificatifUrl;
    
    /**
     * ID de l'utilisateur qui crée le mouvement (pour l'audit)
     */
    private Long createdById;
}
