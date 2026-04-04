package com.hospital.backend.entity;

import com.hospital.backend.entity.Signalement;
import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

@Entity
@Table(name = "doctors")
@Data
public class Doctor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String firstName;
    private String lastName;
    private String specialty;
    private String email;
    private String phoneNumber;
    private String photoUrl;

    // Un docteur peut avoir plusieurs signalements
    @OneToMany(mappedBy = "doctor")
    private List<Signalement> signalements;
}