# 🔧 PROMPT COMPLET - Correction Frontend Flux Hospitalier

## 🎯 **OBJECTIF**
Corriger le frontend pour que le docteur puisse terminer les consultations et les envoyer à la réception.

---

## 📋 **FICHIER À MODIFIER**
`Consultations.jsx` (composant docteur)

---

## 🔍 **PROBLÈMES IDENTIFIÉS**

### **1. URL Incorrecte**
```javascript
// ❌ MAUVAIS (actuel) :
await axios.put(`/api/v1/consultations/${id}`, data)

// ✅ CORRECT (attendu par backend) :
await axios.put(`/api/v1/doctor/consultations/${id}/terminer`, requestData)
```

### **2. Format de payload incorrect**
```javascript
// ❌ MAUVAIS FORMAT (actuel) :
{
  diagnostic: "...",
  exams: [...],
  status: "...",
  // autres champs...
}

// ✅ CORRECT FORMAT (attendu par backend) :
{
  diagnostic: "string",
  examensIds: [1, 2, 3]  // Array de Long[]
}
```

### **3. Fonction à appeler**
```javascript
// ❌ Ancienne fonction : handleUpdateConsultation
// ✅ Nouvelle fonction : terminerConsultation
```

---

## 🛠️ **ÉTAPES DE CORRECTION**

### **Étape 1: Repérer la fonction problématique**
Cherchez dans votre `Consultations.jsx` :
- La fonction qui appelle `/api/v1/consultations/${id}`
- Probablement nommée `handleUpdateConsultation` ou `updateConsultation`

### **Étape 2: Corriger l'URL**
Remplacer :
```javascript
// Ancien code
const response = await axios.put(`/api/v1/consultations/${id}`, data, {
  headers: { Authorization: `Bearer ${token}` }
});

// Nouveau code
const response = await axios.put(`/api/v1/doctor/consultations/${id}/terminer`, requestData, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### **Étape 3: Corriger le payload**
Remplacer :
```javascript
// Ancien format
const requestData = {
  diagnostic: data.diagnostic,
  exams: data.exams,
  status: data.status,
  // autres champs...
};

// Nouveau format
const requestData = {
  diagnostic: data.diagnostic,
  examensIds: data.examens.map(exam => exam.id) || []
};
```

### **Étape 4: Mettre à jour les états**
Assurez-vous que :
- Le statut de la consultation change vers `PENDING_PAYMENT`
- La consultation disparaît de la liste du docteur
- La consultation apparaît dans la liste de la réception

---

## 📝 **CODE COMPLET DE REMPLACEMENT**

### **Fonction terminerConsultation complète**:
```javascript
const terminerConsultation = async (consultationId, examensSelectionnes, diagnosticText) => {
  if (!consultationId || examensSelectionnes.length === 0) {
    message.error('Veuillez sélectionner des examens');
    return;
  }

  try {
    setLoadingTerminer(true);
    const token = localStorage.getItem('token');
    
    // ✅ FORMAT CORRECT pour le backend
    const requestData = {
      diagnostic: diagnosticText,
      examensIds: examensSelectionnes.map(examen => examen.id)
    };

    console.log('📡 Envoi vers:', `/api/v1/doctor/consultations/${consultationId}/terminer`);
    console.log('📋 Payload:', requestData);

    const response = await axios.put(
      `/api/v1/doctor/consultations/${consultationId}/terminer`,
      requestData,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (response.data.success) {
      message.success(`Consultation terminée! Montant: ${response.data.montantTotal} FCFA`);
      
      // Réinitialiser
      setSelectedConsultation(null);
      setSelectedExamens([]);
      setDiagnostic('');
      
      // Recharger la liste
      fetchConsultations();
    } else {
      message.error(response.data.error || 'Erreur lors de la terminaison');
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
    message.error(error.response?.data?.error || 'Erreur lors de la terminaison');
  } finally {
    setLoadingTerminer(false);
  }
};
```

### **Appel depuis le bouton**:
```javascript
<Button 
  type="primary"
  onClick={() => terminerConsultation(
    consultation.id, 
    selectedExamens, 
    diagnostic
  )}
>
  Terminer & Envoyer
</Button>
```

---

## 🧪 **TEST DE VÉRIFICATION**

### **1. Console Logs**
Après correction, vous devriez voir :
```
📡 Envoi vers: /api/v1/doctor/consultations/47/terminer
📋 Payload: {diagnostic: "Infection...", examensIds: [1, 2, 3]}
```

### **2. Réponse Backend**
```
200 OK - Success: true
Montant total: 75000
```

### **3. Réception**
- Rafraîchissez la page `/reception/exams`
- La consultation devrait apparaître avec statut `PENDING_PAYMENT`

---

## 🎯 **RÉSULTAT ATTENDU**

1. ✅ **Plus d'erreur 400** - URL correcte
2. ✅ **Statut PENDING_PAYMENT** - Consultation en attente à la réception
3. ✅ **Examens enregistrés** - Dans la table PrescribedExam
4. ✅ **Montant calculé** - Par le backend
5. ✅ **Flux complet** - Docteur → Réception → Laboratoire

---

## 🚨 **POINTS DE VIGILANCE**

- **Vérifiez bien l'URL**: `/api/v1/doctor/consultations/{id}/terminer`
- **Vérifiez le payload**: `{diagnostic: string, examensIds: long[]}`
- **Vérifiez les logs**: Console doit montrer la bonne URL
- **Testez avec Postman**: Avant de modifier le frontend

---

## 📞 **SOLUTION RAPIDE**

Si vous préférez une solution rapide :
1. **Remplacez complètement** votre `Consultations.jsx` par le fichier `frontend-Consultations-CORRIGE.jsx`
2. **Adaptez les imports** et le style selon votre projet
3. **Testez** le flux complet

Le fichier corrigé contient déjà toute la logique fonctionnelle ! 🎉
