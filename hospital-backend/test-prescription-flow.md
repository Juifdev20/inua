# Test du Flux Hospitalier : Docteur → Réception → Laboratoire

## ✅ **Flux Complet Implémenté**

### **1. Docteur - Prescription d'Examens**

**Endpoint**: `POST /api/v1/doctor/consultations/{id}/prescribe-exams`

**Requête**:
```json
{
  "serviceIds": [1, 2, 3],
  "doctorNotes": ["Urgent", "Normal", "Contrôle"]
}
```

**Réponse**:
```json
{
  "id": 47,
  "patientName": "dmehtr jsuie",
  "status": "PENDING_PAYMENT",
  "prescribedExams": [
    {
      "serviceName": "Analyse Sanguine",
      "unitPrice": 5000,
      "doctorNote": "Urgent"
    }
  ]
}
```

---

### **2. Réception - Liste des Paiements en Attente**

**Endpoint**: `GET /api/v1/reception/pending-payments`

**Réponse**:
```json
[
  {
    "consultationId": 47,
    "consultationCode": "2026-00123",
    "patientName": "dmehtr jsuie",
    "patientCode": "PAT-001",
    "patientPhone": "0123456789",
    "patientPhoto": "/uploads/patient_47.jpg",
    "doctorName": "Dr. Jean Dupont",
    "totalAmount": 15000,
    "amountPaid": 0,
    "remainingAmount": 15000,
    "prescribedExams": [
      {
        "id": 1,
        "serviceId": 1,
        "serviceName": "Analyse Sanguine",
        "unitPrice": 5000,
        "doctorNote": "Urgent",
        "status": "PRESCRIBED"
      },
      {
        "id": 2,
        "serviceId": 2,
        "serviceName": "Radio Thoracique",
        "unitPrice": 10000,
        "doctorNote": "Normal",
        "status": "PRESCRIBED"
      }
    ],
    "status": "PENDING_PAYMENT",
    "createdAt": "2026-03-08T21:30:00"
  }
]
```

---

### **3. Réception - Traitement du Paiement**

**Endpoint**: `POST /api/v1/reception/process-payment/{consultationId}`

**Requête**:
```json
{
  "amountPaid": 15000
}
```

**Validation**:
- ✅ Montant payé >= Montant total
- ❌ Montant payé < Montant total → Erreur

**Réponse**:
```json
{
  "success": true,
  "message": "Paiement traité avec succès"
}
```

---

### **4. Réception - Envoi au Laboratoire**

**Endpoint**: `POST /api/v1/reception/send-to-lab/{consultationId}`

**Réponse**:
```json
{
  "success": true,
  "message": "Consultation envoyée au laboratoire"
}
```

**Statut mis à jour**: `PAID_PENDING_LAB`

---

## 🧪 **Commandes de Test**

### **1. Prescription par le Docteur**
```bash
curl -X POST http://localhost:8080/api/v1/doctor/consultations/47/prescribe-exams \
  -H "Authorization: Bearer DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceIds": [1, 2],
    "doctorNotes": ["Urgent", "Normal"]
  }'
```

### **2. Liste des Paiements en Attente**
```bash
curl -X GET http://localhost:8080/api/v1/reception/pending-payments \
  -H "Authorization: Bearer RECEPTION_TOKEN"
```

### **3. Traitement du Paiement**
```bash
curl -X POST http://localhost:8080/api/v1/reception/process-payment/47 \
  -H "Authorization: Bearer RECEPTION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountPaid": 15000}'
```

### **4. Envoi au Laboratoire**
```bash
curl -X POST http://localhost:8080/api/v1/reception/send-to-lab/47 \
  -H "Authorization: Bearer RECEPTION_TOKEN"
```

---

## 📋 **Historique du Parcours**

### **Étapes du Flux**:
1. **Docteur** prescrit des examens → `PRESCRIBED`
2. **Statut consultation** → `PENDING_PAYMENT`
3. **Réception** traite le paiement → `PAID`
4. **Statut consultation** → `PAID_PENDING_LAB`
5. **Laboratoire** reçoit les examens → `IN_PROGRESS`

### **Logs Attendus**:
```
📋 [PRESCRIPTION] Prescription d'examens pour consultation ID: 47
✅ [PRESCRIPTION] Examen(s) prescrit(s) avec succès
🔍 [RECEPTION] Récupération des paiements en attente
💰 [RECEPTION] Traitement du paiement pour consultation ID: 47
✅ [RECEPTION] Paiement traité avec succès
🧪 [RECEPTION] Envoi au laboratoire pour consultation ID: 47
✅ [RECEPTION] Consultation ID: 47 envoyée au laboratoire
```

---

## 🎯 **Validation Frontend**

### **Composant React: ReceptionPayment.jsx**

**Fonctionnalités**:
- ✅ Affiche la liste des paiements en attente
- ✅ Interface de validation du montant
- ✅ Bouton "Envoyer au Labo" grisé si montant incorrect
- ✅ Mise à jour automatique après traitement
- ✅ Photos des patients et informations complètes

**Logique de Validation**:
```javascript
const isSendToLabDisabled = (payment) => {
  if (!amountReceived || !payment) return true;
  const received = parseFloat(amountReceived);
  const total = parseFloat(payment.totalAmount);
  return received < total || received > total;
};
```

---

## 🏥 **Flux Hospitalier Complet**

```
👨‍⚕️ DOCTEUR           💰 RÉCEPTION           🧪 LABORATOIRE
    │                      │                      │
    ├─ Prescrit           ├─ Liste               ├─ Reçoit
    │  examens            │  paiements           │  examens
    │                     │                      │
    ▼                     ▼                      ▼
PRESCRIBED           PENDING_PAYMENT        IN_PROGRESS
    │                     │                      │
    ▼                     ▼                      ▼
PENDING_PAYMENT      PAID_PENDING_LAB       COMPLETED
```

---

## ✅ **Checklist Finale**

- [x] Entité `PrescribedExam` créée
- [x] Service de prescription implémenté
- [x] Calcul automatique des montants
- [x] API Réception complète
- [x] Validation des paiements
- [x] Composant React fonctionnel
- [x] Logs de traçabilité
- [x] Historique du parcours

**Le flux hospitalier est maintenant entièrement automatisé !** 🎉
