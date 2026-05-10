# 🚨 URGENT - Backend Fix: Diagnostic non retourné

## Problème
Le frontend ne peut pas afficher le diagnostic du médecin car le backend ne le retourne pas dans l'API.

---

## 🔧 CORRECTIONS REQUISES

### 1. Sauvegarder le diagnostic lors de la terminaison

Dans `DoctorApiController.java` - méthode `/terminer`:

```java
@PutMapping("/consultations/{id}/terminer")
public ResponseEntity<?> terminerConsultation(
    @PathVariable Long id, 
    @RequestBody TerminerConsultationRequest request) {
    
    // ✅ CORRECTION: Sauvegarder le diagnostic
    Consultation consultation = consultationService.findById(id);
    consultation.setDiagnostic(request.getDiagnostic());
    consultation.setStatus("labo"); // ou le statut approprié
    
    // Sauvegarder les examens
    if (request.getExamens() != null) {
        List<Examen> examens = request.getExamens().stream()
            .map(examId -> examenService.findById(examId))
            .collect(Collectors.toList());
        consultation.setExamens(examens);
    }
    
    consultationService.save(consultation);
    
    return ResponseEntity.ok(Map.of(
        "success", true,
        "message", "Consultation terminée"
    ));
}
```

### 2. Retourner le diagnostic dans les réponses API

Dans `Consultation.java` ou `ConsultationDTO.java`:

```java
// ✅ Assurer que le champ diagnostic existe
private String diagnostic;

// Getter et Setter
public String getDiagnostic() { return diagnostic; }
public void setDiagnostic(String diagnostic) { this.diagnostic = diagnostic; }
```

### 3. Retourner le diagnostic dans les endpoints GET

Dans `ConsultationController.java` ou `ConsultationService.java`:

```java
// Mapper le diagnostic dans la réponse
public ConsultationDTO toDTO(Consultation consultation) {
    return ConsultationDTO.builder()
        .id(consultation.getId())
        .diagnostic(consultation.getDiagnostic())  // ✅ INCLURE CECI
        .patientName(consultation.getPatient().getFirstName() + " " + 
                     consultation.getPatient().getLastName())
        // ... autres champs
        .build();
}
```

---

## ✅ Checklist

- [ ] Vérifier que `TerminerConsultationRequest` a un champ `diagnostic`
- [ ] Sauvegarder le diagnostic dans la méthode `terminer`
- [ ] Ajouter getter/setter pour `diagnostic` dans l'entité Consultation
- [ ] Mapper le diagnostic dans les réponses API
- [ ] Redémarrer le backend
- [ ] Tester: Terminer une consultation avec diagnostic, puis vérifier dans /reception/exams

---

## 📤 Payload envoyé par le frontend

```json
{
  "diagnostic": "Diagnostic du médecin ici",
  "examens": [1, 2, 3]
}
```

---

## 📥 Réponse attendue du backend

```json
{
  "id": 47,
  "diagnostic": "Diagnostic du médecin ici",
  "patientName": "NOM Patient",
  "examens": [...],
  "status": "labo"
}
```

---

## 🔍 Debug

Ajouter un log pour vérifier:

```java
System.out.println("📋 Diagnostic reçu: " + request.getDiagnostic());
System.out.println("📋 Consultation sauvegardée - Diagnostic: " + consultation.getDiagnostic());
```

