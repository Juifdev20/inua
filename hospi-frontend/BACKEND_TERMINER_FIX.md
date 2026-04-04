# 🚀 CORRECTIONS BACKEND - Sécurité & Automatisation

## 1. SÉCURITÉ: SecurityConfig.java

Ajoute l'autorisation pour ROLE_DOCTEUR sur les consultations:

```java
// Dans la section authorizeHttpRequests de SecurityConfig.java:

// Autoriser les doctors à accéder aux détails de leurs consultations
.requestMatchers(HttpMethod.GET, "/api/v1/consultations/**")
.hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR", "ROLE_RECEPTION", "ROLE_PATIENT")

// Autoriser les doctors à mettre à jour leurs consultations
.requestMatchers(HttpMethod.PUT, "/api/v1/consultations/**")
.hasAnyAuthority("ROLE_ADMIN", "ROLE_DOCTEUR")
```

## 2. AUTOMATISATION: ConsultationServiceImpl.java

Voici le code complet pour `terminerConsultation`:

```java
public ConsultationDTO terminerConsultation(Long id, TerminationDTO dto) {
    // 1. Charger la consultation
    Consultation consultation = consultationRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Consultation non trouvée"));
    
    // 2. Charger les MedicalService depuis la base pour avoir les prix réels
    if (dto.getExams() != null && !dto.getExams().isEmpty()) {
        List<PrescribedExam> prescribedExams = new ArrayList<>();
        double totalAmount = 0.0;
        
        for (TerminationDTO.ExamDTO examDto : dto.getExams()) {
            // Charger le service depuis la base pour avoir le prix réel
            MedicalService service = medicalServiceRepository.findById(examDto.getServiceId())
                .orElseThrow(() -> new RuntimeException("Service non trouvé: " + examDto.getServiceId()));
            
            // Ajouter le prix au total
            totalAmount += service.getPrice();
            
            // Créer l'examen prescrit
            PrescribedExam prescribedExam = PrescribedExam.builder()
                .service(service)
                .doctorNote(examDto.getNote())
                .status(PrescribedExamStatus.PENDING)
                .build();
            prescribedExams.add(prescribedExam);
        }
        
        consultation.setPrescribedExams(prescribedExams);
        
        // 3. Créer l'Admission si elle n'existe pas
        Admission admission = consultation.getAdmission();
        if (admission == null) {
            admission = Admission.builder()
                .patient(consultation.getPatient())
                .doctor(consultation.getDoctor())
                .reasonForVisit(consultation.getReasonForVisit())
                .build();
            admission = admissionRepository.save(admission);
            consultation.setAdmission(admission);
        }
        
        // 4. Lier les données et calculer le montant total
        admission.setTotalAmount(totalAmount);
        admission.setStatus(AdmissionStatus.EN_ATTENTE);
        
        // Sauvegarder l'admission mise à jour
        admissionRepository.save(admission);
        
        // 5. Mettre à jour la consultation
        consultation.setDiagnostic(dto.getDiagnostic());
        consultation.setTraitement(dto.getTraitement());
        consultation.setNotesMedicales(dto.getNotesMedicales());
        consultation.setStatut("PENDING_PAYMENT"); // Statut pour la réception
        
        // Sauvegarder la consultation
        consultation = consultationRepository.save(consultation);
        
        log.info("✅ Consultation {} terminée - Montant total: {} - Statut: PENDING_PAYMENT", 
                  id, totalAmount);
    } else {
        // Pas d'examens, juste finaliser la consultation
        consultation.setDiagnostic(dto.getDiagnostic());
        consultation.setTraitement(dto.getTraitement());
        consultation.setNotesMedicales(dto.getNotesMedicales());
        consultation.setStatut("TERMINEE");
        consultation = consultationRepository.save(consultation);
        
        log.info("✅ Consultation {} terminée sans examens", id);
    }
    
    // Retourner le DTO
    return mapToDTO(consultation);
}
```

## 3. DTO: TerminationDTO

```java
package com.hospital.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class TerminationDTO {
    private String diagnostic;
    private String traitement;
    private String notesMedicales;
    private List<ExamDTO> exams;
    
    @Data
    public static class ExamDTO {
        private Long serviceId;
        private String note;
    }
}
```

## 4. RÉCAPITULATIF DU FLUX

```
Docteur → terminarConsultation()
    ↓
1. Charger MedicalService (prix réels)
2. Créer PrescribedExam pour chaque examen
3. Si pas d'Admission → créer nouvelle Admission
4. Calculer totalAmount (somme des prix)
5. Sauvegarder Admission
6. Mettre statut = "PENDING_PAYMENT"
7. Sauvegarder Consultation
    ↓
Réception → see consultation with PENDING_PAYMENT
    ↓
Patient → Paiement
```

## Checklist

- [ ] Mettre à jour SecurityConfig.java
- [ ] Implémenter terminerConsultation avec création d'Admission automatique
- [ ] Redémarrer le backend
- [ ] Tester: Médecin termine consultation avec examens
- [ ] Vérifier: Une ligne est créée dans la table admissions
- [ ] Vérifier: La réception voit la consultation

