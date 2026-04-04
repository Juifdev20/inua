package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "prescribed_exams")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescribedExam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Consultation à laquelle appartient cet examen prescrit
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consultation_id", nullable = false)
    @JsonIgnoreProperties({"patient", "doctor", "labTests", "prescriptions"})
    private Consultation consultation;

    /**
     * Service médical correspondant à l'examen
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    @JsonIgnoreProperties({"consultations"})
    private MedicalService service;

    /**
     * Nom figé du service au moment de la prescription
     * (évite les incohérences si le nom du service change plus tard)
     */
    @Column(nullable = false)
    private String serviceName;

    /**
     * Prix unitaire de l'examen au moment de la prescription
     */
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal unitPrice;

    /**
     * Quantité demandée
     */
    @Builder.Default
    @Column(nullable = false)
    private Integer quantity = 1;

    /**
     * Total de la ligne = unitPrice * quantity
     */
    @Builder.Default
    @Column(name = "total_price", precision = 19, scale = 2)
    private BigDecimal totalPrice = BigDecimal.ZERO;

    /**
     * Note laissée par le médecin
     */
    @Column(name = "doctor_note", columnDefinition = "TEXT")
    private String doctorNote;

    /**
     * Note laissée par la caisse
     */
    @Column(name = "cashier_note", columnDefinition = "TEXT")
    private String cashierNote;

    /**
     * Note laissée par le laboratoire
     */
    @Column(name = "lab_note", columnDefinition = "TEXT")
    private String labNote;

    // ═══════════════════════════════════════════════════════════════
    // CHAMPS POUR LES RÉSULTATS DU LABORATOIRE (Boîte modèle)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Valeur du résultat saisie par le laborantin
     * Peut être numérique (1.2) ou texte (Positif/Négatif)
     */
    @Column(name = "result_value", length = 100)
    private String resultValue;

    /**
     * Unité de mesure (ex: g/L, mmol/L, UI/L)
     */
    @Column(name = "unit", length = 20)
    private String unit;

    /**
     * Valeur minimale de référence (normale)
     */
    @Column(name = "reference_min", length = 50)
    private String referenceMin;

    /**
     * Valeur maximale de référence (normale)
     */
    @Column(name = "reference_max", length = 50)
    private String referenceMax;

    /**
     * Texte complet des valeurs de référence (ex: "0.8 - 1.2 g/L")
     */
    @Column(name = "reference_range_text", length = 100)
    private String referenceRangeText;

    /**
     * Indique si la valeur est critique (hors limites dangereuses)
     */
    @Builder.Default
    @Column(name = "is_critical")
    private Boolean isCritical = false;

    /**
     * Commentaire/Interprétation du laborantin sur le résultat
     */
    @Column(name = "lab_comment", columnDefinition = "TEXT")
    private String labComment;

    /**
     * Date de saisie du résultat
     */
    @Column(name = "result_entered_at")
    private LocalDateTime resultEnteredAt;

    /**
     * Laborantin qui a saisi le résultat
     */
    @Column(name = "result_entered_by", length = 100)
    private String resultEnteredBy;

    /**
     * Méthode d'analyse utilisée
     */
    @Column(name = "analysis_method", length = 100)
    private String analysisMethod;

    /**
     * true = examen retenu dans le circuit
     * false = retiré / annulé par la caisse
     */
    @Builder.Default
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    /**
     * Raison du retrait / annulation
     */
    @Column(name = "removal_reason", columnDefinition = "TEXT")
    private String removalReason;

    /**
     * Statut métier de l'examen
     */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PrescribedExamStatus status = PrescribedExamStatus.PRESCRIBED;

    @Column(name = "created_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        normalizeAndCompute();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        normalizeAndCompute();
    }

    private void normalizeAndCompute() {
        if (quantity == null || quantity < 1) {
            quantity = 1;
        }

        if (unitPrice == null) {
            unitPrice = BigDecimal.ZERO;
        }

        totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));

        if (active == null) {
            active = true;
        }

        if (status == null) {
            status = PrescribedExamStatus.PRESCRIBED;
        }
    }
}