# 🚀 CORRECTIONS BACKEND - Performance & Erreur 500

## 1. OPTIMISATION: JOIN FETCH dans ConsultationRepository

Ajoute cette méthode dans `ConsultationRepository.java`:

```java
@Query("SELECT c FROM Consultation c " +
       "LEFT JOIN FETCH c.patient " +
       "LEFT JOIN FETCH c.doctor " +
       "LEFT JOIN FETCH c.admission " +
       "LEFT JOIN FETCH c.prescribedExams pe " +
       "LEFT JOIN FETCH pe.service " +
       "WHERE c.doctor.id = :doctorId " +
       "ORDER BY c.createdAt DESC")
List<Consultation> findByDoctorIdWithDetails(@Param("doctorId") Long doctorId);
```

## 2. CASSER LA BOUCLE JSON: MedicalService.java

Ajoute `@JsonIgnore` sur la liste des consultations:

```java
// Dans com.hospital.backend.entity.MedicalService

@JsonIgnore
@OneToMany(mappedBy = "service", fetch = FetchType.LAZY)
private List<PrescribedExam> prescribedExams;
```

## 3. DTO SIMPLIFIÉ: ConsultationDTO.java

Crée un DTO léger pour la liste:

```java
package com.hospital.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultationListDTO {
    private Long id;
    private String consultationCode;
    private String patientName;
    private Long patientId;
    private String patientPhoto;
    private String doctorName;
    private String reasonForVisit;
    private String status;
    private LocalDateTime createdAt;
    
    // Uniquement le montant total, pas les détails des exams
    private Double examTotalAmount;
    private Integer examCount;
}
```

## 4. MISE À JOUR: ConsultationServiceImpl.java

Modifie la méthode pour utiliser le DTO simplifié:

```java
public List<ConsultationListDTO> getConsultationsForDoctor(Long doctorId) {
    List<Consultation> consultations = consultationRepository.findByDoctorIdWithDetails(doctorId);
    
    return consultations.stream()
        .map(this::mapToListDTO)
        .collect(Collectors.toList());
}

private ConsultationListDTO mapToListDTO(Consultation c) {
    // Calculer le montant total des examens
    Double totalAmount = 0.0;
    if (c.getPrescribedExams() != null) {
        totalAmount = c.getPrescribedExams().stream()
            .mapToDouble(pe -> pe.getService() != null ? pe.getService().getPrice() : 0.0)
            .sum();
    }
    
    return ConsultationListDTO.builder()
        .id(c.getId())
        .consultationCode(c.getConsultationCode())
        .patientName(c.getPatient() != null ? 
            c.getPatient().getFirstName() + " " + c.getPatient().getLastName() : "Inconnu")
        .patientId(c.getPatient() != null ? c.getPatient().getId() : null)
        .patientPhoto(c.getPatient() != null ? c.getPatient().getPhotoUrl() : null)
        .doctorName(c.getDoctor() != null ? 
            c.getDoctor().getFirstName() + " " + c.getDoctor().getLastName() : "Inconnu")
        .reasonForVisit(c.getAdmission() != null ? c.getAdmission().getReasonForVisit() : 
                       (c.getReasonForVisit() != null ? c.getReasonForVisit() : "Consultation"))
        .status(c.getStatut() != null ? c.getStatut() : "EN_ATTENTE")
        .createdAt(c.getCreatedAt())
        .examTotalAmount(totalAmount)
        .examCount(c.getPrescribedExams() != null ? c.getPrescribedExams().size() : 0)
        .build();
}
```

## 5. CORRECTION NULLPOINTER: Vérifications de sécurité

Ajoute des vérifications null dans toutes les méthodes qui accèdent aux relations:

```java
// Exemple de protection
private String getPatientName(Consultation c) {
    if (c == null || c.getPatient() == null) {
        return "Patient Inconnu";
    }
    return c.getPatient().getFirstName() + " " + c.getPatient().getLastName();
}

private String getDoctorName(Consultation c) {
    if (c == null || c.getDoctor() == null) {
        return "Non assigné";
    }
    return c.getDoctor().getFirstName() + " " + c.getDoctor().getLastName();
}

private String getMotif(Consultation c) {
    if (c == null) return "Consultation Standard";
    
    if (c.getAdmission() != null && 
        c.getAdmission().getReasonForVisit() != null &&
        !c.getAdmission().getReasonForVisit().isEmpty()) {
        return c.getAdmission().getReasonForVisit();
    }
    
    if (c.getReasonForVisit() != null && !c.getReasonForVisit().isEmpty()) {
        return c.getReasonForVisit();
    }
    
    return "Consultation Standard";
}
```

## Checklist

- [ ] Ajouter JOIN FETCH dans ConsultationRepository
- [ ] Ajouter @JsonIgnore sur MedicalService.prescribedExams
- [ ] Créer ConsultationListDTO
- [ ] Mettre à jour ConsultationServiceImpl pour utiliser le nouveau DTO
- [ ] Ajouter vérifications null
- [ ] Redémarrer le backend
- [ ] Tester /api/v1/doctor/consultations

