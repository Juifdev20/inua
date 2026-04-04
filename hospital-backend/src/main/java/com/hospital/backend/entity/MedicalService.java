package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
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
    private String departement; // Plus tard, on pourra lier à l'entité Department

    @Column(nullable = false)
    private Double prix;

    private Integer duree; // en minutes (ex: 30, 45)

    @Column(name = "is_active")
    private Boolean isActive = true;

    // ✅ NOUVEAU: Relation inverse avec Consultation
    @ManyToMany(mappedBy = "services", fetch = FetchType.LAZY)
    @JsonIgnore
    @JsonIgnoreProperties({"services", "hibernateLazyInitializer", "handler"})
    private Set<Consultation> consultations = new HashSet<>();
}