# 🛠️ PROMPT POUR CORRECTION BACKEND

## 📋 Problèmes à résoudre

Le frontend fait des appels API qui échouent avec des erreurs 500. Voici les problèmes identifiés et les corrections nécessaires :

---

## 🔴 PROBLÈME 1 : Endpoints manquants pour le Docteur

### Erreur actuelle :
```
GET /api/v1/doctor/patients → 500 (Internal Server Error)
GET /api/v1/doctor/consultations → 500 (Internal Server Error)
```

### Solution requise :
Créer les endpoints suivants dans le contrôleur du médecin :

```java
// Endpoint pour récupérer les patients du médecin
@GetMapping("/doctor/patients")
public ResponseEntity<?> getDoctorPatients(Authentication authentication) {
    // Retourner la liste des patients du médecin connecté
}

// Endpoint pour récupérer les consultations du médecin
@GetMapping("/doctor/consultations")
public ResponseEntity<?> getDoctorConsultations(Authentication authentication) {
    // Retourner la liste des consultations du médecin connecté
}
```

---

## 🔴 PROBLÈME 2 : Lier les Admissions aux Consultations

### Problème détecté :
Quand on récupère une consultation, le champ `admissionId` est `null`.

### Solution requise :
Dans la réponse de l'endpoint `/api/v1/consultations/{id}`, inclure :
- `admissionId` - L'ID de l'admission associée
- OU inclure directement les signes vitaux dans l'objet consultation

**Exemple de réponse attendue :**
```json
{
  "id": 38,
  "poids": 70,
  "temperature": 37.2,
  "taille": 175,
  "tensionArterielle": "120/80",
  "admissionId": 15,
  "patient": { ... },
  "reasonForVisit": "Consultation générale"
}
```

---

## 🔴 PROBLÈME 3 : URLs d'images avec doubles slashes

### Erreur actuelle :
```
GET /uploads/profiles//uploads/doc_7_xxx.jpg → 403 (Forbidden)
```

### Solution requise :
Corriger le chemin des photos dans la configuration Spring :
- Les URLs ne doivent PAS contenir `/uploads//uploads/`
- Utiliser un chemin cohérent comme `/uploads/...` ou `/api/uploads/...`

---

## ✅ Checklist de validation

Après les corrections, tester ces endpoints :

| Méthode | Endpoint | Réponse attendue |
|---------|----------|-------------------|
| GET | `/api/v1/doctor/patients` | Liste des patients (200 OK) |
| GET | `/api/v1/doctor/consultations` | Liste des consultations (200 OK) |
| GET | `/api/v1/consultations/38` | Consultation AVEC `admissionId` ou signes vitaux |

---

## 📝 Notes pour le développeur Backend

1. **Activer les logs** pour voir les erreurs exactes dans la console
2. **Vérifier les permissions** - Le médecin doit avoir accès à ces endpoints
3. **Vérifier la requête** - Les headers doivent inclure le token JWT

---

## 🔗 Référence frontend

Le frontend utilise maintenant :
- Base URL : `http://localhost:8080/api/v1`
- Headers : `Authorization: Bearer {token}`
- Le frontend est prêt à recevoir les données correctement formatées

