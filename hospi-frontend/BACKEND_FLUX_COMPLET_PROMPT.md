# 🚀 PROMPT URGENT - Correction du Flux Docteur → Réception

## Problème
Quand le médecin clique sur "Terminer & envoyer", la consultation n'apparaît PAS dans l'interface ExamReception de la réception.

---

## 🔴 CAUSE IDENTIFIÉE

1. **URL incorrecte**: Le frontend envoie vers `/api/v1/doctor/consultations/{id}` mais le backend doit accepter `/api/v1/consultations/{id}`

2. **Statut non reconnu**: Le frontend envoie `ATTENTE_PAIEMENT_LABO` mais le filtre Reception cherche ce même statut

3. **Données manquantes**: Le patientName, doctorName, patientPhoto doivent être au niveau racine de la réponse

---

## ✅ CORRECTIONS REQUISES

### 1. DoctorApiController.java - Endpoint PUT

```java
@PutMapping("/consultations/{id}")
public ResponseEntity<?> updateConsultation(@PathVariable Long id, 
    @RequestBody ConsultationUpdateRequest request,
    Authentication authentication) {
    
    // 1. Récupérer la consultation
    Consultation consultation = consultationService.findById(id);
    
    // 2. Mettre à jour les champs
    if (request.getDiagnostic() != null) {
        consultation.setDiagnostic(request.getDiagnostic());
    }
    if (request.getTraitement() != null) {
        consultation.setTraitement(request.getTraitement());
    }
    if (request.getNotesMedicales() != null) {
        consultation.setNotesMedicales(request.getNotesMedicales());
    }
    
    // 3. Mettre à jour les examens
    if (request.getExams() != null) {
        consultation.setExams(request.getExams());
    }
    
    // 4. Mettre à jour le STATUT
    if (request.getStatut() != null) {
        consultation.setStatut(request.getStatut());
        // ⚠️ IMPORTANT: Sauvegarder en base de données
        consultationService.save(consultation);
        
        // Log pour confirmer
        System.out.println("✅ Statut mis à jour pour la consultation " + id + " : " + request.getStatut());
    }
    
    return ResponseEntity.ok(consultation);
}
```

### 2. Consultation Entity - Ajouter le champ statut

```java
@Entity
public class Consultation {
    // ... autres champs
    private String statut;  // ✅ Ajouter ce champ
    
    // Getter/Setter
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
}
```

### 3. ConsultationRepository - Méthode de recherche

```java
public interface ConsultationRepository extends JpaRepository<Consultation, Long> {
    List<Consultation> findByStatut(String statut);
}
```

### 4. Fichier application.properties - logs

```properties
# Activer les logs SQL pour le débogage
spring.jpa.show-sql=true
logging.level.com.inua=DEBUG
```

---

## 🔍 Checklist de débogage

| Étape | Action | Comment vérifier |
|-------|--------|-----------------|
| 1 | Vérifier que PUT /consultations/{id} fonctionne | Tester avec Postman |
| 2 | Vérifier que le statut est sauvegardé | Regarder les logs console |
| 3 | Vérifier que la liste en base contient le bon statut | Requête SQL |
| 4 | Vérifier le filtre GET /consultations | Retourne les bonnes consultations |

---

## 📋 Commandes SQL de vérification

```sql
-- Voir toutes les consultations
SELECT id, patient_id, statut, created_at FROM consultations ORDER BY id DESC LIMIT 10;

-- Voir les consultations en attente de paiement labo
SELECT * FROM consultations WHERE statut = 'ATTENTE_PAIEMENT_LABO';

-- Mettre à jour manuellement une consultation (pour test)
UPDATE consultations SET statut = 'ATTENTE_PAIEMENT_LABO' WHERE id = 1;
```

---

## 📱 Ce que le frontend attend

### POST /api/v1/consultations/{id}
**Body:**
```json
{
  "diagnostic": "Diagnostic...",
  "traitement": "Traitement...",
  "exams": [
    { "serviceId": 1, "note": "À jeun" }
  ],
  "statut": "ATTENTE_PAIEMENT_LABO"
}
```

### GET /api/v1/consultations
**Réponse attendue:**
```json
{
  "content": [
    {
      "id": 1,
      "patientName": "DUPONT JEAN",
      "patientPhoto": "/uploads/photo.jpg",
      "statut": "ATTENTE_PAIEMENT_LABO",
      "exams": [{ "serviceId": 1, "note": "..." }]
    }
  ]
}
```

---

## 🎯 Résultat attendu

1. Médecin clique "Terminer & envoyer"
2. Console backend affiche: "Statut mis à jour pour la consultation X : ATTENTE_PAIEMENT_LABO"
3. Réceptionnaire rafraîchit la page /reception/exams
4. La consultation apparaît dans la liste
5. Après paiement, le statut change à "labo"

