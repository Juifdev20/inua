# 🔧 PROCÉDURE DE TEST COMPLÈTE

## Étape 1: Redémarrer le backend
```bash
# Arrêter le backend s'il tourne
# Puis le redémarrer avec les nouveaux logs
mvn spring-boot:run
```

## Étape 2: Tester avec le médecin
1. Se connecter comme médecin
2. Prendre une consultation en cours
3. Ajouter des examens (ex: Hémogramme, Radio)
4. Cliquer sur "Terminer consultation"
5. Mettre un diagnostic

## Étape 3: Surveiller les logs du backend
Vous devriez voir exactement ces logs:

```
🏁 [DOCTOR] Terminaison de la consultation ID: 123 par DrDupont
📋 Diagnostic: Patient avec fièvre
📋 Examens IDs: [1, 2]
🏁 [TERMINER] DÉBUT - Terminaison de la consultation ID: 123
📋 [TERMINER] Examens reçus: [1, 2]
📋 [TERMINER] Diagnostic reçu: Patient avec fièvre
✅ [TERMINER] Consultation trouvée: ID=123, Patient=Jean, Médecin=DrDupont
🔍 [TERMINER] Chargement de 2 services
📦 [TERMINER] Services trouvés en base: [1:Hémogramme, 2:Radio]
💰 [TERMINER] Montant total calculé automatiquement: 25000
🔗 [TERMINER] Services liés à la consultation: [1:Hémogramme, 2:Radio]
💾 [TERMINER] Sauvegarde de la consultation avec 2 services
✅ [TERMINER] Consultation 123 terminée avec succès - Montant total: 25000 - Services: 2
```

## Étape 4: Vérifier la base de données
```sql
-- Vérifier que la consultation a bien les services
SELECT 
    c.id,
    c.consultation_code,
    c.exam_total_amount,
    COUNT(cs.service_id) as nb_services,
    STRING_AGG(s.nom, ', ') as services_noms
FROM consultations c
LEFT JOIN consultation_services cs ON c.id = cs.consultation_id
LEFT JOIN medical_services s ON cs.service_id = s.id
WHERE c.id = 123  -- Mettre l'ID de la consultation testée
GROUP BY c.id, c.consultation_code, c.exam_total_amount;
```

## Étape 5: Tester avec la réception
1. Se connecter comme réceptionniste
2. Aller à la page ExamReception
3. Cliquer sur "Actualiser"
4. Vérifier que la consultation apparaît avec:
   - `exams > 0`
   - `totalAmount > 0`
   - Noms des examens visibles

## 🚨 Si problème persiste:

### Cas 1: Pas de logs détaillés
- **Cause:** Backend pas redémarré
- **Solution:** Redémarrer complètement le backend

### Cas 2: Logs mais pas de services dans la BD
- **Cause:** Cascade JPA ne fonctionne pas
- **Solution:** Vérifier la configuration @ManyToMany

### Cas 3: Services dans BD mais frontend vide
- **Cause:** DTO mapping incorrect
- **Solution:** Vérifier mapToDTO()

## 📋 Checklist:
- [ ] Backend redémarré
- [ ] Logs détaillés visibles
- [ ] Services dans consultation_services
- [ ] totalAmount > 0
- [ ] Frontend affiche les examens
