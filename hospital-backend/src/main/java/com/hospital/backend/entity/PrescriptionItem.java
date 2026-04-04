package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "prescription_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"prescription", "medication"})
@EqualsAndHashCode(exclude = {"prescription", "medication"})
public class PrescriptionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ✅ CORRECTION : Empêche la boucle infinie avec la Prescription parente
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    @JsonIgnoreProperties({"items", "consultation", "patient", "doctor"})
    private Prescription prescription;

    // ✅ CORRECTION : Permet d'afficher les détails du médicament (Nom, Forme, etc.)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medication_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "stock", "prescriptions"})
    private Medication medication;

    // --- SAISIE DOCTEUR ---
    private Integer quantity;
    private String dosage;
    private String frequency;
    private Integer duration;
    private Integer quantityPerDose;  // Quantité par prise

    @Column(name = "duration_unit")
    private String durationUnit;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    // --- SAISIE PHARMACIE (Pour la Finance) ---
    @Column(name = "unit_price")
    private Double unitPrice;

    @Column(name = "total_price")
    private Double totalPrice;

    @Column(name = "is_dispensed")
    @Builder.Default
    private Boolean isDispensed = false;

    @Column(name = "dispensed_quantity")
    private Integer dispensedQuantity;

    // ✅ CORRECTION : Utilisation de Double.valueOf pour éviter les erreurs de calcul si nul
    @PrePersist
    @PreUpdate
    public void calculateTotal() {
        if (this.unitPrice != null && this.quantity != null) {
            this.totalPrice = this.unitPrice * this.quantity.doubleValue();
        } else {
            this.totalPrice = 0.0;
        }
    }
}