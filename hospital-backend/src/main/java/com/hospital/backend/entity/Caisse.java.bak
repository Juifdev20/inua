package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Entité représentant une caisse physique (USD ou CDF)
 * Chaque caisse a son propre solde et gère ses transactions
 */
@Entity
@Table(name = "caisses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"transactions", "managedBy"})
@EqualsAndHashCode(exclude = {"transactions", "managedBy"})
public class Caisse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(length = 255)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Currency devise;

    @Column(nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal solde = BigDecimal.ZERO;

    @Column(name = "solde_initial", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal soldeInitial = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "managed_by")
    @JsonIgnoreProperties({"password", "role", "permissions", "patient"})
    private User managedBy;

    @OneToMany(mappedBy = "caisse", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"caisse"})
    private List<FinanceTransaction> transactions;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Débite la caisse (sortie d'argent)
     * @param montant le montant à débiter
     * @throws IllegalStateException si solde insuffisant
     */
    public void debiter(BigDecimal montant) {
        if (montant == null || montant.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le montant doit être positif");
        }
        if (this.solde.compareTo(montant) < 0) {
            throw new IllegalStateException("Solde insuffisant dans la caisse " + this.nom);
        }
        this.solde = this.solde.subtract(montant);
    }

    /**
     * Crédite la caisse (entrée d'argent)
     * @param montant le montant à créditer
     */
    public void crediter(BigDecimal montant) {
        if (montant == null || montant.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le montant doit être positif");
        }
        this.solde = this.solde.add(montant);
    }

    /**
     * Vérifie si la caisse a suffisamment de fonds
     */
    public boolean hasSufficientFunds(BigDecimal montant) {
        return this.solde.compareTo(montant) >= 0;
    }
}
