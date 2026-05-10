# 🚀 PROMPT BACKEND - Réception Paiements & Laboratoire

## Objectif
Créer les endpoints nécessaires pour la page "Paiements" de la réception qui reçoit automatiquement les consultations prescrites par les docteurs et permet le traitement des paiements.

---

## 📡 ENDPOINTS REQUIS

### 1. GET /api/v1/reception/pending-payments
Récupère les consultations en attente de paiement labo.

**Réponse attendue:**
```json
{
  "content": [
    {
      "id": 38,
      "patientId": 12,
      "patientName": "DIEUDONNE JEAN",
      "patientPhoto": "/uploads/patients/photo.jpg",
      "doctorId": 5,
      "doctorName": "Dr. MARTIN",
      "motif": "Fièvre et maux de tête",
      "createdAt": "2026-03-08T10:30:00",
      "exams": [
        {
          "serviceId": 1,
          "note": "À jeun"
        },
        {
          "serviceId": 2,
          "note": null
        }
      ],
      "status": "ATTENTE_PAIEMENT_LABO"
    }
  ]
}
```

### 2. GET /api/v1/reception/today-processed
Récupère les consultations traitées aujourd'hui.

**Réponse attendue:**
```json
{
  "content": [
    {
      "id": 35,
      "patientName": "DUPONT MARIE",
      "examAmountPaid": 25000,
      "exams": [...],
      "status": "labo"
    }
  ]
}
```

### 3. GET /api/v1/reception/stats
Récupère les statistiques de la réception.

**Réponse attendue:**
```json
{
  "totalPending": 5,
  "totalAmount": 125000,
  "todayProcessed": 12,
  "todayRevenue": 250000
}
```

### 4. PUT /api/v1/consultations/{id}/pay-lab
Valide le paiement et envoie au laboratoire.

**Requête:**
```json
{
  "examAmountPaid": 25000,
  "status": "labo"
}
```

---

## 🔧 CORRECTIONS REQUISES SUR CONSULTATION

### Dans ConsultationController:

1. **Ajouter patientName au niveau racine** de la réponse:
```java
consultationDTO.setPatientName(patient.getFirstName() + " " + patient.getLastName());
```

2. **Ajouter doctorName** (nom du médecin qui a prescrit):
```java
consultationDTO.setDoctorName(doctor.getFirstName() + " " + doctor.getLastName());
```

3. **Ajouter patientPhoto**:
```java
consultationDTO.setPatientPhoto(patient.getPhotoUrl());
```

4. **Filtrer par statut ATTENTE_PAIEMENT_LABO**:
```java
@GetMapping("/reception/pending-payments")
public ResponseEntity<?> getPendingPayments() {
    List<Consultation> consultations = consultationService
        .findByStatus("ATTENTE_PAIEMENT_LABO");
    // Mapper et retourner
}
```

---

## ✅ CHECKLIST

- [ ] Endpoint pending-payments fonctionne
- [ ] Endpoint today-processed fonctionne
- [ ] Endpoint stats fonctionne
- [ ] Le paiement met à jour le statut vers "labo"
- [ ] Les dates sont au format ISO
- [ ] Les noms patient/docteur sont corrects

