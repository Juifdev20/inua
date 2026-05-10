# 🔍 SCRIPT DE DÉBOGAGE - Consultations du Docteur

## 📋 Problème
Le réceptionniste envoie une consultation mais elle n'apparaît pas dans la liste du docteur.

## 🧪 Tests à Exécuter

### Test 1 : Vérifier que la consultation est bien créée

```bash
# Remplacez {TOKEN} par le token du réceptionniste
curl -X POST "http://localhost:8080/api/v1/consultations" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 5,
    "doctorId": 7,
    "reasonForVisit": "Test consultation",
    "poids": "70",
    "temperature": "37.2",
    "taille": "175",
    "tensionArterielle": "120/80"
  }'
```

### Test 2 : Vérifier la consultation en base de données

```sql
-- Vérifier que la consultation a été créée avec le bon doctorId
SELECT id, patient_id, doctor_id, reason_for_visit, status, created_at 
FROM consultations 
WHERE doctor_id = 7 
ORDER BY created_at DESC 
LIMIT 5;
```

### Test 3 : Tester l'endpoint du docteur

```bash
# Remplacez {TOKEN} par le token du docteur
curl -X GET "http://localhost:8080/api/v1/doctor/consultations" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.'
```

### Test 4 : Vérifier les logs du backend

```bash
# Dans la console du backend, cherchez ces logs :
grep -i "consultation.*doctor.*7" logs/application.log
grep -i "erreur.*récupération.*consultations" logs/application.log
```

## 🔍 Points de Vérification

### 1. Vérifier la création de consultation
- [ ] La consultation est bien créée en base
- [ ] Le `doctor_id` est correct (7 dans l'exemple)
- [ ] Le `status` est bien `EN_ATTENTE`

### 2. Vérifier l'endpoint du docteur
- [ ] L'endpoint `/api/v1/doctor/consultations` retourne 200 OK
- [ ] Le token JWT du docteur est valide
- [ ] L'ID du docteur dans le token correspond à `doctor_id` en base

### 3. Vérifier les relations
- [ ] Les relations Patient et Admission sont chargées
- [ ] Pas d'erreur LazyInitializationException
- [ ] Les données patientName sont présentes

## 🚨 Problèmes Possibles

### Problème 1 : Mauvais doctorId
- Le réceptionniste envoie un `doctorId` incorrect
- Solution : Vérifier l'ID du docteur dans la base

### Problème 2 : Token JWT invalide
- Le docteur utilise un token expiré ou incorrect
- Solution : Générer un nouveau token pour le docteur

### Problème 3 : Relations non chargées
- LazyInitializationException sur Patient ou Admission
- Solution : Forcer le chargement des relations (déjà corrigé)

### Problème 4 : Filtre incorrect
- La consultation est filtrée par statut ou autre critère
- Solution : Vérifier les filtres dans la requête

## 🔧 Solution Immédiate

### Ajouter des logs de débogage

Dans `DoctorApiController.java`, ajoutez ces logs :

```java
@GetMapping("/consultations")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTEUR')")
public ResponseEntity<List<Map<String, Object>>> getConsultations(Authentication authentication) {
    try {
        String identifier = authentication.getName();
        log.info("🔍 Recherche des consultations pour l'identifiant: {}", identifier);
        
        User doctorUser = userRepository.findByEmailOrUsername(identifier, identifier)
                .orElseThrow(() -> new RuntimeException("Docteur non trouvé"));
        
        log.info("👨‍⚕️ Docteur trouvé - ID: {}, Email: {}", doctorUser.getId(), doctorUser.getEmail());
        
        List<Consultation> consultations = consultationRepository.findByDoctorId(doctorUser.getId());
        log.info("📋 Nombre de consultations trouvées: {}", consultations.size());
        
        // Logger les IDs des consultations
        consultations.forEach(c -> {
            log.info("📄 Consultation ID: {}, Patient: {}, Status: {}", 
                c.getId(), 
                c.getPatient() != null ? c.getPatient().getFirstName() + " " + c.getPatient().getLastName() : "NULL",
                c.getStatus());
        });
        
        // ... reste du code ...
    } catch (Exception e) {
        log.error("❌ Erreur lors de la récupération des consultations du docteur: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(List.of(Map.of("error", "Erreur: " + e.getMessage())));
    }
}
```

## ✅ Actions à Entreprendre

1. **Exécutez les tests** ci-dessus
2. **Vérifiez les logs** du backend
3. **Ajoutez les logs de débogage** si nécessaire
4. **Testez avec le réceptionniste** et le **docteur**
5. **Comparez les ID** entre création et récupération

## 🎯 Résultat Attendu

Après corrections :
- ✅ Les consultations créées par le réceptionniste apparaissent dans la liste du docteur
- ✅ Les logs montrent les bonnes informations
- ✅ Plus d'erreurs 500 sur l'endpoint `/api/v1/doctor/consultations`
