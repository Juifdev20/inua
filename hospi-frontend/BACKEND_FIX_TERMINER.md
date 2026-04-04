# 🔧 URGENT - Correction Backend: Erreur Integer vers Long

## Erreur actuelle
```
class java.lang.Integer cannot be cast to class java.lang.Long
```

## Problème
Le endpoint `/doctor/consultations/{id}/terminer` tente de caster un `Integer` en `Long`, ce qui échoue.

---

## ✅ CORRECTION REQUISE

### Fichier: DoctorApiController.java

```java
@PutMapping("/consultations/{id}/terminer")
public ResponseEntity<?> terminerConsultation(@PathVariable Long id, 
    @RequestBody TerminerConsultationRequest request) {
    
    // ⚠️ CORRECTION: Le problème est ici
    // Les IDs des examens arrivent comme Integer mais sont castés en Long
    
    try {
        // Option 1: Accepter les Integer directement
        List<Long> examensIds = request.getExamensIds().stream()
            .map(id -> id.longValue())  // Convertir Integer en Long
            .collect(Collectors.toList());
        
        // Option 2 (Alternative): Modifier le DTO pour accepter Integer
        List<Integer> examensIdsInteger = request.getExamensIds();
        
        // Continuez avec la logique...
        
        // Log de confirmation
        System.out.println("✅ Consultation terminée: " + id);
        System.out.println("✅ Examens prescrits: " + examensIds);
        System.out.println("✅ Statut mis à jour: PENDING_PAYMENT");
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "montantTotal", montantCalcule
        ));
        
    } catch (Exception e) {
        System.out.println("❌ Erreur: " + e.getMessage());
        return ResponseEntity.badRequest().body(Map.of(
            "success", false,
            "error", e.getMessage()
        ));
    }
}
```

### Fichier: TerminerConsultationRequest.java

```java
public class TerminerConsultationRequest {
    private String diagnostic;
    
    // ⚠️ CORRECTION: Utiliser Integer au lieu de Long
    private List<Integer> examensIds;  // Au lieu de List<Long>
    
    // Getter/Setter
    public List<Integer> getExamensIds() { return examensIds; }
    public void setExamensIds(List<Integer> examensIds) { this.examensIds = examensIds; }
}
```

---

## 🔍 Alternative: Accepter les deux types

Si vous voulez accepter Integer OU Long:

```java
@PutMapping("/consultations/{id}/terminer")
public ResponseEntity<?> terminerConsultation(@PathVariable Long id, 
    @RequestBody Map<String, Object> request) {
    
    // Extraire diagnostic
    String diagnostic = (String) request.get("diagnostic");
    
    // Gérer les deux formats d'examens
    List<Long> examensIds = new ArrayList<>();
    
    Object examensObj = request.get("examens");
    if (examensObj instanceof List) {
        List<?> examensList = (List<?>) examensObj;
        for (Object exam : examensList) {
            if (exam instanceof Number) {
                examensIds.add(((Number) exam).longValue());
            }
        }
    }
    
    // Log
    System.out.println("📋 Diagnostic: " + diagnostic);
    System.out.println("📋 Examens: " + examensIds);
    
    // Continuez...
}
```

---

## ✅ Checklist

- [ ] Modifier `TerminerConsultationRequest` pour accepter `List<Integer>`
- [ ] Ou ajouter la conversion `.longValue()` dans le controller
- [ ] Redémarrer le backend
- [ ] Tester: PUT /api/v1/doctor/consultations/30/terminer

---

## 📤 Format attendu du frontend

```json
{
  "diagnostic": "mon diagnostic",
  "examens": [{"id": 1}]
}
```

