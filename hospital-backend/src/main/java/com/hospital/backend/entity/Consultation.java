package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.math.BigDecimal;

@Entity
@Table(name = "consultations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = {"patient", "doctor", "labTests", "prescriptions", "prescribedExams", "invoice", "admission", "service", "services"})  // 👈 CORRECTION: Ajout de "invoice" et autres lazy pour éviter recursion (extension de l'existant)
@ToString(exclude = {"patient", "doctor", "labTests", "prescriptions", "prescribedExams", "invoice", "admission", "service", "services"})  // 👈 CORRECTION: Évite recursion dans toString()
public class Consultation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Numéro de fiche unique (ex: 1011/2026) généré à la réception
    @Column(name = "consultation_code", unique = true, nullable = true)
    private String consultationCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    @JsonIgnoreProperties({"consultations", "medicalRecords", "user", "createdBy"})
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    @JsonIgnoreProperties({"password", "role", "permissions"})
    private User doctor;

    // --- RELATION ADMISSION ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admission_id")
    @JsonIgnoreProperties({"patient", "doctor"})
    private Admission admission;

    @Column(name = "consultation_date")
    private LocalDateTime consultationDate;

    // --- DÉCISION DU DOCTEUR ---
    @Column(name = "decision_note", columnDefinition = "TEXT")
    private String decisionNote;

    @Column(name = "proposed_new_date")
    private LocalDateTime proposedNewDate;

    // --- SECTION RÉCEPTION / PARAMÈTRES VITAUX ---
    private String poids;
    private String temperature;
    private String taille;
    private String tensionArterielle;
    private Double fraisFiche;

    // --- SERVICE ET PAIEMENTS ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private MedicalService service;

    @ManyToMany(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinTable(
            name = "consultation_services",
            joinColumns = @JoinColumn(name = "consultation_id"),
            inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    @JsonIgnore
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Set<MedicalService> services = new HashSet<>();

    private Double ficheAmountDue = 0.0;
    private Double ficheAmountPaid = 0.0;
    private Double consulAmountDue = 0.0;
    private Double consulAmountPaid = 0.0;

    // --- SECTION MÉDICALE (DOCTEUR) ---
    @Column(name = "reason_for_visit", columnDefinition = "TEXT")
    private String reasonForVisit;

    // Compatibilité frontend
    @Column(name = "reason_for_visit", columnDefinition = "TEXT", insertable = false, updatable = false)
    private String motif;

    @Column(columnDefinition = "TEXT")
    private String symptoms;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @Column(columnDefinition = "TEXT")
    private String treatment;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // --- HOSPITALISATION ---
    @Column(name = "is_hospitalized")
    @Builder.Default
    private Boolean isHospitalized = false;

    @Column(name = "date_entree")
    private LocalDateTime dateEntree;

    @Column(name = "date_sortie")
    private LocalDateTime dateSortie;

    // --- WORKFLOW ---
    @Enumerated(EnumType.STRING)
    private ConsultationStatus status;

    // Compatibilité frontend / ancien système
    @Column(name = "statut")
    private String statut;

    /**
     * true si le médecin a demandé des examens labo
     */
    @Column(name = "requires_lab_test")
    @Builder.Default
    private Boolean requiresLabTest = false;

    @Column(name = "requires_prescription")
    @Builder.Default
    private Boolean requiresPrescription = false;

    // --- RELATIONS MÉTIER ---
    @JsonIgnoreProperties("consultation")
    @OneToMany(mappedBy = "consultation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<LabTest> labTests;

    @JsonIgnoreProperties("consultation")
    @OneToMany(mappedBy = "consultation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Prescription> prescriptions;

    /**
     * ✅ SOURCE PRINCIPALE POUR LES EXAMENS PRESCRITS
     * Le médecin ajoute ici les examens.
     * La caisse les relit, ajuste, recalcule le montant, encaisse,
     * puis envoie au laboratoire.
     */
    @JsonIgnoreProperties("consultation")
    @OneToMany(mappedBy = "consultation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PrescribedExam> prescribedExams;

    /**
     * ⚠️ Ancien mécanisme / compatibilité éventuelle.
     * Ne pas utiliser comme source principale dans le nouveau workflow.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "consultation_exams", joinColumns = @JoinColumn(name = "consultation_id"))
    private List<ExamItem> exams;

    /**
     * Montant déjà payé pour les examens
     */
    @Builder.Default
    @Column(name = "exam_amount_paid", precision = 19, scale = 2)
    private BigDecimal examAmountPaid = BigDecimal.ZERO;

    /**
     * Montant total courant des examens retenus pour paiement
     */
    @Builder.Default
    @Column(name = "exam_total_amount", precision = 19, scale = 2)
    private BigDecimal examTotalAmount = BigDecimal.ZERO;

    // --- FACTURE ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "patient", "items"})
    private Invoice invoice;

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

        if (examAmountPaid == null) {
            examAmountPaid = BigDecimal.ZERO;
        }

        if (examTotalAmount == null) {
            examTotalAmount = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();

        if (examAmountPaid == null) {
            examAmountPaid = BigDecimal.ZERO;
        }

        if (examTotalAmount == null) {
            examTotalAmount = BigDecimal.ZERO;
        }
    }
}