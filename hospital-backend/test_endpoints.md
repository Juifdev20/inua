# 🧪 SCRIPT DE TEST DES ENDPOINTS - Copiez-Collez

## 📋 Instructions de Test

Utilisez ces commandes curl ou Postman pour tester chaque endpoint. Remplacez `{TOKEN}` par votre token JWT valide.

---

## 🔴 TEST 1 : Endpoint Doctor Consultations

### Commande curl :
```bash
curl -X GET "http://localhost:8080/api/v1/doctor/consultations" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json"
```

### Réponse attendue (200 OK) :
```json
[
  {
    "id": 38,
    "consultationDate": "2026-03-07T23:30:00",
    "status": "EN_ATTENTE",
    "reasonForVisit": "Consultation générale",
    "admissionId": 15,
    "poids": 70,
    "temperature": 37.2,
    "taille": 175,
    "tensionArterielle": "120/80",
    "patientId": 5,
    "patientName": "Jean Dupont"
  }
]
```

---

## 🔴 TEST 2 : Endpoint Doctor Patients

### Commande curl :
```bash
curl -X GET "http://localhost:8080/api/v1/doctor/patients" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json"
```

### Réponse attendue (200 OK) :
```json
[
  {
    "id": 5,
    "firstName": "Jean",
    "lastName": "Dupont",
    "fullName": "Jean Dupont",
    "email": "jean.dupont@email.com",
    "phoneNumber": "0123456789",
    "dateOfBirth": "1990-01-01",
    "poids": 70,
    "temperature": 37.2,
    "taille": 175,
    "tensionArterielle": "120/80"
  }
]
```

---

## 🔴 TEST 3 : Endpoint Consultation Details

### Commande curl :
```bash
curl -X GET "http://localhost:8080/api/v1/consultations/38" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json"
```

### Réponse attendue (200 OK) :
```json
{
  "id": 38,
  "consultationCode": "CONS-20260307-001",
  "consultationDate": "2026-03-07T23:30:00",
  "status": "EN_ATTENTE",
  "reasonForVisit": "Consultation générale",
  "poids": 70,
  "temperature": 37.2,
  "taille": 175,
  "tensionArterielle": "120/80",
  "admissionId": 15,
  "patient": {
    "id": 5,
    "firstName": "Jean",
    "lastName": "Dupont",
    "email": "jean.dupont@email.com"
  },
  "doctor": {
    "id": 7,
    "firstName": "Dr",
    "lastName": "Martin",
    "doctorPhoto": "/uploads/doctors/doc_7_1772543092629_JUIF DEV.jpg"
  }
}
```

---

## 🔴 TEST 4 : Test Image URL

### Commande curl :
```bash
curl -I "http://localhost:8080/uploads/doctors/doc_7_1772543092629_JUIF%20DEV.jpg"
```

### Réponse attendue (200 OK) :
```
HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Length: 1267511
```

---

## ✅ Checklist de Validation

Cochez chaque case après test :

- [ ] `/api/v1/doctor/consultations` → 200 OK avec signes vitaux
- [ ] `/api/v1/doctor/patients` → 200 OK avec signes vitaux  
- [ ] `/api/v1/consultations/38` → 200 OK avec admissionId
- [ ] Image URL → 200 OK (pas de 403)
- [ ] Pas de double slash dans les URLs d'images
- [ ] admissionId présent dans les réponses

---

## 🔍 Logs à Vérifier

Dans les logs du backend, vous devriez voir :

```
⚠️ Consultation 38 sans admission, recherche de la dernière admission du patient 5...
✅ Admission 15 liée à la consultation 38
```

Ou si création automatique :

```
⚠️ Consultation 38 sans admission, recherche de la dernière admission du patient 5...
⚠️ Aucune admission trouvée, création automatique...
✅ Nouvelle admission 16 créée pour la consultation 38
```

---

## 🚀 Si Tests Échouent

### Erreur 500 sur endpoints docteur :
- Vérifiez que le token JWT est valide
- Vérifiez que l'utilisateur a le rôle `ROLE_DOCTEUR`
- Consultez les logs du backend pour l'erreur exacte

### admissionId toujours null :
- La première appel à `/api/v1/consultations/{id}` créera automatiquement l'admission
- Réessayez le même appel une seconde fois

### Erreur 403 sur images :
- Vérifiez que SecurityConfig contient `/uploads/**`
- Vérifiez que le fichier image existe dans le dossier `uploads/doctors/`

---

## 📞 Instructions Frontend

Après validation backend, le frontend peut utiliser :

```javascript
// Base URL
const API_BASE = 'http://localhost:8080/api/v1';

// Headers
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

// Appels API
const consultations = await axios.get('/doctor/consultations', { headers });
const patients = await axios.get('/doctor/patients', { headers });
const consultationDetails = await axios.get('/consultations/38', { headers });
```
