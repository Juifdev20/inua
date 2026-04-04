# 🔍 DIAGNOSTIC COMPLET - Consultations du Docteur

## 📋 Procédure de Diagnostic Complète

### Étape 1 : Vérifier la consultation créée par le réceptionniste

```bash
# 1. Connectez-vous avec le compte du réceptionniste
# 2. Créez une consultation pour le docteur ID 7
# 3. Notez l'ID de la consultation retournée
```

### Étape 2 : Vérifier en base de données

```sql
-- Vérifier que la consultation existe avec le bon doctorId
SELECT 
    c.id,
    c.patient_id,
    c.doctor_id,
    c.reason_for_visit,
    c.status,
    c.created_at,
    p.first_name,
    p.last_name,
    d.email as doctor_email
FROM consultations c
LEFT JOIN patients p ON c.patient_id = p.id
LEFT JOIN users d ON c.doctor_id = d.id
WHERE c.doctor_id = 7
ORDER BY c.created_at DESC
LIMIT 10;
```

### Étape 3 : Tester l'endpoint du docteur avec logs détaillés

```bash
# Remplacez {TOKEN_DOCTOR} par le token JWT du docteur
curl -X GET "http://localhost:8080/api/v1/doctor/consultations" \
  -H "Authorization: Bearer {TOKEN_DOCTOR}" \
  -H "Content-Type: application/json" \
  -v
```

### Étape 4 : Analyser les logs du backend

Dans la console du backend, cherchez ces messages :

```
🔍 [DEBUG] Recherche des consultations pour l'identifiant: doctor@gmail.com
👨‍⚕️ [DEBUG] Docteur trouvé - ID: 7, Email: doctor@gmail.com, Username: doctor
📋 [DEBUG] Nombre de consultations brutes trouvées: X
📄 [DEBUG] Consultation brute - ID: 38, DoctorID: 7, PatientID: 5, Status: EN_ATTENTE
👤 [DEBUG] Patient initialisé - ID: 5, Nom: Jean Dupont
✅ [DEBUG] PatientName ajouté: Jean Dupont
📤 [DEBUG] Nombre de consultations mappées retournées: X
🎯 [DEBUG] Consultation finale - ID: 38, Patient: Jean Dupont, Status: EN_ATTENTE
```

## 🚨 Points de Contrôle

### ✅ Si vous voyez ces logs positifs :
- Le problème est probablement dans le frontend
- Le backend fonctionne correctement

### ❌ Si vous voyez ces logs négatifs :
- `Nombre de consultations brutes trouvées: 0` → Problème de doctorId
- `Patient NULL pour consultation ID: X` → Problème de relation Patient
- `Impossible d'ajouter patientName - Patient NULL` → Problème de mapping

## 🔧 Tests Supplémentaires

### Test 5 : Vérifier le token JWT

```bash
# Décoder le token pour vérifier l'ID du docteur
# Allez sur https://jwt.io/ et collez le token du docteur
# Vérifiez que l'ID correspond bien à celui en base
```

### Test 6 : Tester avec Postman

1. **Configuration Postman :**
   - Method: GET
   - URL: http://localhost:8080/api/v1/doctor/consultations
   - Headers: Authorization: Bearer {TOKEN_DOCTOR}
   - Headers: Content-Type: application/json

2. **Vérifiez la réponse :**
   - Status: 200 OK
   - Body: Array avec les consultations

### Test 7 : Vérifier les permissions

```bash
# Vérifier que le docteur a bien le rôle ROLE_DOCTEUR
SELECT email, roles 
FROM users u 
JOIN user_roles ur ON u.id = ur.user_id 
JOIN roles r ON ur.role_id = r.id 
WHERE u.id = 7;
```

## 🎯 Scénarios Possibles

### Scénario 1 : Mauvais doctorId dans la consultation
- **Symptôme :** Les consultations existent mais avec un autre doctorId
- **Solution :** Vérifier l'ID du docteur lors de la création

### Scénario 2 : Token JWT invalide
- **Symptôme :** Le docteur est authentifié mais avec un mauvais ID
- **Solution :** Générer un nouveau token pour le docteur

### Scénario 3 : Filtrage par statut
- **Symptôme :** Seules certaines consultations apparaissent
- **Solution :** Vérifier les filtres dans la requête

### Scénario 4 : Problème de cache
- **Symptôme :** Les anciennes données s'affichent
- **Solution :** Redémarrer le backend et vider le cache

## 📊 Checklist de Diagnostic

- [ ] La consultation est bien créée en base avec le bon doctorId
- [ ] Le token JWT du docteur contient le bon ID
- [ ] L'endpoint `/api/v1/doctor/consultations` retourne 200 OK
- [ ] Les logs montrent les consultations trouvées
- [ ] Les logs montrent le patientName correct
- [ ] Le frontend reçoit bien les données

## 🚀 Action Immédiate

1. **Exécutez les tests SQL** pour vérifier les données
2. **Redémarrez le backend** avec les nouveaux logs
3. **Testez l'endpoint** et copiez les logs complets
4. **Comparez** les ID entre création et récupération
5. **Partagez les logs** si le problème persiste

## 📞 Si Toujours Bloqué

Si après tous ces tests le problème persiste, partagez :
1. **Les logs complets du backend** (avec les messages DEBUG)
2. **Le résultat de la requête SQL** (étape 2)
3. **La réponse de l'endpoint** (étape 3)
4. **Le contenu du token JWT décodé**

Avec ces informations, nous pourrons identifier exactement le problème !
