package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "prescription_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medication_id", nullable = false)
    private Medication medication;

    // --- SAISIE DOCTEUR ---
    private Integer quantity;
    private String dosage;
    private String frequency;
    private Integer duration;
    @Column(name = "duration_unit")
    private String durationUnit;
    @Column(columnDefinition = "TEXT")
    private String instructions;

    // --- SAISIE PHARMACIE (Pour la Finance) ---
    @Column(name = "unit_price")
    private Double unitPrice; // Le prix saisi par la pharmacie

    @Column(name = "total_price")
    private Double totalPrice; // Calculé auto : unitPrice * quantity

    @Column(name = "is_dispensed")
    private Boolean isDispensed = false;

    @Column(name = "dispensed_quantity")
    private Integer dispensedQuantity;

    // Calcul automatique du total avant sauvegarde
    @PrePersist
    @PreUpdate
    public void calculateTotal() {
        if (this.unitPrice != null && this.quantity != null) {
            this.totalPrice = this.unitPrice * this.quantity;
        } else {
            this.totalPrice = 0.0;
        }
    }
}