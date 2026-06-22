package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import com.hospital.backend.entity.Currency;
import java.util.Set;
import java.util.HashSet;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "medical_services")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    private String description;

    @Column(nullable = false)
    private String departement; // Plus tard, on pourra lier Ã  l'entitÃ© Department

    @Column(nullable = false)
    private Double prix;

    @Enumerated(EnumType.STRING)
    @Column(name = "currency", nullable = false)
    @Builder.Default
    private Currency currency = Currency.USD; // Devise par défaut : USD
    private Integer duree; // en minutes (ex: 30, 45)

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    // ★ MULTI-TENANT: Hôpital associé
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Hospital hospital;

    // âœ… NOUVEAU: Relation inverse avec Consultation
    @ManyToMany(mappedBy = "services", fetch = FetchType.LAZY)
    @JsonIgnore
    @JsonIgnoreProperties({"services", "hibernateLazyInitializer", "handler"})
    @Builder.Default
    private Set<Consultation> consultations = new HashSet<>();
}

