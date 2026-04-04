package com.hospital.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "consultations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Consultation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Numéro de fiche unique (ex: 1011/2026) généré à la réception
    // Note : nullable est mis à true pour permettre la réservation initiale sans code de fiche
    @Column(name = "consultation_code", unique = true, nullable = true)
    private String consultationCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private User doctor;

    @Column(name = "consultation_date")
    private LocalDateTime consultationDate;

    // --- NOUVEAUX CHAMPS POUR LA DÉCISION DU DOCTEUR ---
    @Column(name = "decision_note", columnDefinition = "TEXT")
    private String decisionNote; // Motif si reporté (EN_ATTENTE) ou annulé (CANCELLED)

    @Column(name = "proposed_new_date")
    private LocalDateTime proposedNewDate; // Si le docteur propose un autre rendez-vous

    // --- SECTION RÉCEPTION / PARAMÈTRES VITAUX ---
    private String poids;
    private String temperature;
    private String taille;
    private String tensionArterielle;
    private Double fraisFiche; // Enregistré par la réception

    // --- SECTION MÉDICALE (DOCTEUR) ---
    @Column(name = "reason_for_visit", columnDefinition = "TEXT")
    private String reasonForVisit; // Motif initial fourni par le patient

    @Column(columnDefinition = "TEXT")
    private String symptoms; // Anamnèse / Plaintes

    @Column(columnDefinition = "TEXT")
    private String diagnosis; // Diagnostic final

    @Column(columnDefinition = "TEXT")
    private String treatment;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // --- SECTION HOSPITALISATION ---
    @Column(name = "is_hospitalized")
    private Boolean isHospitalized = false;

    @Column(name = "date_entree")
    private LocalDateTime dateEntree;

    @Column(name = "date_sortie")
    private LocalDateTime dateSortie;

    // --- WORKFLOW ET RELATIONS ---
    @Enumerated(EnumType.STRING)
    private ConsultationStatus status;

    @Column(name = "requires_lab_test")
    private Boolean requiresLabTest = false;

    @Column(name = "requires_prescription")
    private Boolean requiresPrescription = false;

    @OneToMany(mappedBy = "consultation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<LabTest> labTests;

    @OneToMany(mappedBy = "consultation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Prescription> prescriptions;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = ConsultationStatus.EN_ATTENTE;
        }
        // On ne force plus la date système ici si c'est un RDV programmé
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}