---
# TODO_LAB_FINAL - PLAN APPROUVÉ: Finaliser module laboratoire (Queue + Results)

## Statut: ✅ PLAN APPROUVÉ PAR USER - EN COURS D'EXÉCUTION

## Étapes logiques du plan (à cocher au fur et à mesure):

### 1-3. Backend complet [✅ DTOs/Repo/Service/Controller implémentés]

### 4. Frontend - LabQueue.jsx [✅ handleTakeInCharge loading/localStorage/navigate exact, cleanup useEffect]
- [ ] handleTakeInCharge: +setLoading, localStorage patient/group_id, navigate `/results/${group.id}` + state exact
- [ ] useEffect cleanup localStorage

### 5. Frontend - LabResults.jsx [PENDING]
- [ ] useEffect: hasLoadedOnce guard, useParams.examId → patientId → API /patient/active-tests fallback local, supprimer TOUS timeouts
- [ ] handleSubmitResults: axios batch /batch-results, clear exact keys, timeout 1500 queue

### 6. Tests & Validation [PENDING]
- [ ] Backend mvnw clean compile
- [ ] Full workflow: queue → take → results (F5) → submit → queue
- [ ] BDD: status VALIDE, Network 200 batch

### 7. Completion [PENDING]
- [ ] attempt_completion avec résultats + commandes demo

**Prochain outil: edit_file backend repo first (safe). Progress tracked here.**
---
