package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ★ ENTITÉ EXAMEN DE LABORATOIRE
 * Représente un type d'analyse biologique disponible au laboratoire
 */
@Entity
@Table(name = "examens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Examen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 20)
    private String code; // Ex: GLY, CRP, NFS, HIV

    @Column(name = "nom", nullable = false, length = 100)
    private String nom; // Ex: Glycémie, CRP, Numération Formule Sanguine

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "prix", nullable = false, precision = 15, scale = 2)
    private BigDecimal prix;

    @Column(name = "unite", length = 20)
    private String unite; // Ex: g/L, mmol/L, UI/L, %

    @Column(name = "valeur_min_reference", precision = 10, scale = 3)
    private BigDecimal valeurMinReference; // Valeur minimale normale

    @Column(name = "valeur_max_reference", precision = 10, scale = 3)
    private BigDecimal valeurMaxReference; // Valeur maximale normale

    @Column(name = "categorie", length = 50)
    private String categorie; // Ex: BIOCHIMIE, HEMATOLOGIE, SEROLOGIE, MICROBIOLOGIE

    @Column(name = "delai_resultat_heures")
    private Integer delaiResultatHeures; // Délai estimé pour les résultats

    @Column(name = "actif", nullable = false)
    @Builder.Default
    private Boolean actif = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private MedicalService service; // Service parent (optionnel)

    // ★ MULTI-TENANT: Hôpital propriétaire de l'examen
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Hospital hospital;

    @PrePersist
    public void prePersist() {
        if (actif == null) {
            actif = true;
        }
    }

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Vérifie si une valeur est dans les limites normales
     */
    public boolean isValeurNormale(BigDecimal valeur) {
        if (valeur == null || valeurMinReference == null || valeurMaxReference == null) {
            return true; // Sans référence, on considère normal
        }
        return valeur.compareTo(valeurMinReference) >= 0 && valeur.compareTo(valeurMaxReference) <= 0;
    }

    /**
     * Retourne les valeurs de référence formatées
     */
    public String getValeursReferenceFormatees() {
        if (valeurMinReference == null || valeurMaxReference == null) {
            return "Non définie";
        }
        String uniteStr = unite != null ? " " + unite : "";
        return String.format("%.2f - %.2f%s", valeurMinReference, valeurMaxReference, uniteStr);
    }
}
