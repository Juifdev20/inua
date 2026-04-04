package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entité représentant la grille tarifaire de l'hôpital
 * Chaque prix est valide pour une période donnée
 */
@Entity
@Table(name = "price_list")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceList {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false)
    private PriceListType serviceType;

    @Column(nullable = false)
    private String nom; // Ex: "Fiche Patient", "Consultation Générale"

    @Column(name = "unit_price", precision = 10, scale = 2, nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "description")
    private String description;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_until")
    private LocalDateTime validUntil;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @PrePersist
    protected void onCreate() {
        if (validFrom == null) {
            validFrom = LocalDateTime.now();
        }
    }

    /**
     * Vérifie si ce prix est actuellement valide
     */
    public boolean isCurrentlyValid() {
        LocalDateTime now = LocalDateTime.now();
        boolean afterStart = validFrom == null || !now.isBefore(validFrom);
        boolean beforeEnd = validUntil == null || !now.isAfter(validUntil);
        return isActive && afterStart && beforeEnd;
    }
}

