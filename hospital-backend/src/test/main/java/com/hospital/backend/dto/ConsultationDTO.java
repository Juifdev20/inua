package com.hospital.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.hospital.backend.entity.ConsultationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

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

    // --- INFOS MÉDICALES ---
    @JsonProperty("reasonForVisit")
    private String reasonForVisit;

    private String symptoms;
    private String diagnosis;
    private String treatment;
    private String notes;

    @JsonProperty("status")
    private ConsultationStatus status;

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

    // --- EXAMENS ET ORDONNANCES ---
    @Builder.Default
    private Boolean requiresLabTest = false;

    @Builder.Default
    private Boolean requiresPrescription = false;

    @Builder.Default
    private List<LabTestDTO> labTests = new ArrayList<>();

    @Builder.Default
    private List<PrescriptionDTO> prescriptions = new ArrayList<>();

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    // --- LOGIQUE DE COMPATIBILITÉ FRONTEND (GETTERS DYNAMIQUES) ---

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