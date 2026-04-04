package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

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
}