package com.hospital.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entité représentant un document de dossier patient généré automatiquement
 * lorsque la consultation est marquée comme TERMINÉE.
 */
@Entity
@Table(name = "patient_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"consultation"})
@EqualsAndHashCode(exclude = {"consultation"})
public class PatientDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_path", columnDefinition = "TEXT", nullable = false)
    private String filePath;

    @Column(name = "file_url", columnDefinition = "TEXT")
    private String fileUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false)
    private DocumentType documentType;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Relations
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consultation_id")
    @JsonIgnoreProperties({"patient", "doctor", "labTests", "prescriptions", "prescribedExams"})
    private Consultation consultation;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "patient_name")
    private String patientName;

    // Informations financières pour le badge de statut
    @Column(name = "total_amount")
    private Double totalAmount;

    @Column(name = "amount_paid")
    private Double amountPaid;

    @Column(name = "remaining_credit")
    private Double remainingCredit;
    
    // Statut de paiement (pour les documents importés manuellement)
    @Column(name = "payment_status")
    private String paymentStatus;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (documentType == null) {
            documentType = DocumentType.DOSSIER_PATIENT;
        }
    }
}

