package com.hospital.backend.dto; // ✅ Placé dans le bon package DTO

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.hospital.backend.entity.ConsultationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO pour le transfert des données de consultation.
 * Regroupe les infos Patient, Médecin et Paramètres vitaux.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultationDTO {

    private Long id;
    private String consultationCode;

    // --- INFOS PATIENT ---
    @NotNull(message = "Le patient est obligatoire")
    @JsonProperty("patientId")
    private Long patientId;

    @JsonProperty("patientName")
    private String patientName;

    @JsonProperty("patientPhoto")
    private String patientPhoto;

    private String phoneNumber;
    private String gender;
    private String profession;
    private String maritalStatus;
    private String birthPlace;
    private String religion;
    private String nationality;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private java.time.LocalDate dateOfBirth;

    // --- INFOS MÉDECIN ---
    @NotNull(message = "Le médecin est obligatoire")
    @JsonProperty("doctorId")
    private Long doctorId;

    @JsonProperty("doctorName")
    private String doctorName;

    @JsonProperty("doctorPhoto")
    private String doctorPhoto;

    private String departmentName;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @JsonProperty("consultationDate")
    private LocalDateTime consultationDate;

    // --- PARAMÈTRES VITAUX ---
    private String poids;
    private String temperature;
    private String taille;
    private String tensionArterielle;
    private Double fraisFiche;

    // --- SERVICE ET PAIEMENTS ---
    @NotNull(message = "Le service est obligatoire")
    private Long serviceId;

    private String serviceName;
    private Double servicePrice;

    private Double ficheAmountDue = 0.0;
    private Double ficheAmountPaid = 0.0;
    private Double consulAmountDue = 0.0;
    private Double consulAmountPaid = 0.0;

    // --- INFOS MÉDICALES ---
    @JsonProperty("reasonForVisit")
    private String reasonForVisit;

    @JsonProperty("motif")
    private String motif;

    private String symptoms;
    private String diagnosis;
    private String treatment;
    private String notes;

    @JsonProperty("status")
    private ConsultationStatus status;

    // ✅ AJOUT POUR COMPATIBILITÉ FRONTEND
    @JsonProperty("statut")
    private String statut;

    @JsonProperty("decisionNote")
    private String decisionNote;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @JsonProperty("proposedNewDate")
    private LocalDateTime proposedNewDate;

    // --- HOSPITALISATION ---
    @Builder.Default
    @JsonProperty("isHospitalized")
    private Boolean isHospitalized = false;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dateEntree;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dateSortie;

    // ✅ DATE DE CLÔTURE (finalisation par le docteur)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @JsonProperty("dateCloture")
    private LocalDateTime dateCloture;

    // --- EXAMENS ET ORDONNANCES ---
    @Builder.Default
    private Boolean requiresLabTest = false;

    @Builder.Default
    private Boolean requiresPrescription = false;

    // Assurez-vous que ces DTO existent dans votre projet
    @Builder.Default
    private List<Object> labTests = new ArrayList<>();

    @Builder.Default
    private List<Object> prescriptions = new ArrayList<>();

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @JsonProperty("createdAt")
    private LocalDateTime createdAt;

    @JsonProperty("createdAtIso")
    public String getCreatedAtIso() {
        if (this.createdAt == null) return null;
        try {
            return this.createdAt.format(DateTimeFormatter.ISO_DATE_TIME);
        } catch (Exception e) {
            return null;
        }
    }

    @JsonProperty("createdAtTimestamp")
    public Long getCreatedAtTimestamp() {
        if (this.createdAt == null) return null;
        try {
            return this.createdAt.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
        } catch (Exception e) {
            return null;
        }
    }

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    // --- NOUVEAUX CHAMPS ---
    private List<ExamItemDTO> exams;
    private BigDecimal examAmountPaid;
    private BigDecimal examTotalAmount;  // ✅ NOUVEAU: Montant total des examens
    private List<MedicalServiceDTO> services;  // ✅ NOUVEAU: Services liés à la consultation
    private Long admissionId;

    // --- GETTERS/SETTERS POUR ADMISSION ---
    public Long getAdmissionId() { 
        return admissionId; 
    }
    
    public void setAdmissionId(Long admissionId) { 
        this.admissionId = admissionId; 
    }

    // --- VALIDATION ET SIGNATURE ---
    private String numeroFiche;
    private LocalDateTime dateValidation;
    private Long signataireId;
    private String signatureImage;
    private Boolean isValidated;

    // --- LOGIQUE DE COMPATIBILITÉ FRONTEND ---

    @JsonProperty("statut")
    public String getStatut() {
        return this.status != null ? this.status.name() : "EN_ATTENTE";
    }

    @JsonProperty("date")
    public String getFormattedDate() {
        if (this.consultationDate == null) return "--";
        try {
            return this.consultationDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        } catch (Exception e) {
            return "--";
        }
    }

    @JsonProperty("time")
    public String getFormattedTime() {
        if (this.consultationDate == null) return "--";
        try {
            return this.consultationDate.format(DateTimeFormatter.ofPattern("HH:mm"));
        } catch (Exception e) {
            return "--";
        }
    }

    @JsonProperty("specialty")
    public String getSpecialty() {
        return (this.departmentName != null && !this.departmentName.isEmpty())
                ? this.departmentName
                : "Médecine Générale";
    }

    @JsonProperty("idPatient")
    public Long getIdPatient() {
        return this.patientId;
    }
}