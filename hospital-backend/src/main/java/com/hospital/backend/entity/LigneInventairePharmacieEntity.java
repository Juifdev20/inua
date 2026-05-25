package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "lignes_inventaire_pharmacie")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LigneInventairePharmacieEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_inventaire", nullable = false)
    private InventairesPharmacie inventaire;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_medicament", nullable = false)
    private Medication medicament;

    @Column(name = "stock_theorique", precision = 15, scale = 3)
    @Builder.Default
    private BigDecimal stockTheorique = BigDecimal.ZERO;

    @Column(name = "stock_physique", precision = 15, scale = 3)
    @Builder.Default
    private BigDecimal stockPhysique = BigDecimal.ZERO;

    @Column(name = "ecart", precision = 15, scale = 3)
    @Builder.Default
    private BigDecimal ecart = BigDecimal.ZERO;

    @Column(name = "valeur_ecart", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal valeurEcart = BigDecimal.ZERO;

    @Column(name = "observation", columnDefinition = "TEXT")
    private String observation;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
