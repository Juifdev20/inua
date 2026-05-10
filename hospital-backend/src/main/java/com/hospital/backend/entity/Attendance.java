package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.Duration;

@Entity
@Table(name = "attendance") // Indique le nom de la table dans la BD
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false) // Liaison avec la table employees
    private Employee employee;

    @Column(name = "check_in")
    private LocalDateTime checkIn;

    @Column(name = "check_out")
    private LocalDateTime checkOut;

    private String status;

    @Column(name = "work_hours")
    private Double workHours;
    // Méthode utilitaire pour calculer la durée de travail
    public void calculateWorkHours() {
        if (checkIn != null && checkOut != null) {
            long minutes = Duration.between(checkIn, checkOut).toMinutes();
            this.workHours = minutes / 60.0; // Conversion en heures (ex: 8.5 pour 8h30)
        }
    }
}