package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicUpdate;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ★ ENTITÉ: TAUX DE CHANGE
 * Stocke les taux de conversion entre devises
 * Permet à l'admin de configurer dynamiquement les taux
 */
@Entity
@Table(name = "exchange_rates")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@DynamicUpdate
public class ExchangeRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Devise source (ex: USD)
     */
    @Column(name = "currency_from", nullable = false, length = 3)
    private String currencyFrom;

    /**
     * Devise cible (ex: FC)
     */
    @Column(name = "currency_to", nullable = false, length = 3)
    private String currencyTo;

    /**
     * Taux de conversion (ex: 2800 pour 1 USD = 2800 FC)
     */
    @Column(name = "rate", nullable = false, precision = 19, scale = 6)
    private BigDecimal rate;

    /**
     * Description optionnelle
     */
    @Column(name = "description")
    private String description;

    /**
     * Actif/Inactif
     */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Utilisateur qui a créé/modifié le taux
     */
    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "updated_by_name")
    private String updatedByName;

    /**
     * Dates de création et mise à jour
     */
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isActive == null) {
            isActive = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Méthode utilitaire pour convertir un montant
     */
    public BigDecimal convert(BigDecimal amount) {
        if (amount == null || rate == null) {
            return BigDecimal.ZERO;
        }
        return amount.multiply(rate);
    }

    /**
     * Méthode utilitaire pour obtenir la paire de devises
     */
    public String getCurrencyPair() {
        return currencyFrom + "/" + currencyTo;
    }
}
