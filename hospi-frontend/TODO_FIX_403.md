# Plan de Correction des Erreurs 403 (Forbidden)

## Diagnostic des Problèmes Identifiés

### 1. URL API Incompatible
- **Frontend appelle**: `GET /api/v1/doctors/dashboard`
- **Backend attend**: `GET /api/v1/doctors/{doctorId}/dashboard`

### 2. Incohérence du Format du Rôle
- Le JWT contient le rôle `DOCTEUR` (sans préfixe)
- `@PreAuthorize` attend `ROLE_DOCTEUR` (avec préfixe)
- SecurityConfig utilise un mélange des deux formats

---

## Corrections à Appliquer

### Fichier 1: SecurityConfig.java
**Chemin**: `hospital-backend/src/main/java/com/hospital/backend/config/SecurityConfig.java`

**Problème**: Les règles pour `/api/v1/doctors/**` n'ont pas le bon format de rôle

**Solution**: Uniformiser les rôles pour utiliser `ROLE_` partout

### Fichier 2: DoctorDashboardController.java  
**Chemin**: `hospital-backend/src/main/java/com/hospital/backend/controller/DoctorDashboardController.java`

**Problème**: L'endpoint requiert un doctorId mais le frontend n'envoie pas

**Solution**: Créer un endpoint sans ID qui utilise le token pour identifier le médecin

### Fichier 3: JwtAuthenticationFilter.java
**Chemin**: `hospital-backend/src/main/java/com/hospital/backend/security/JwtAuthenticationFilter.java`

**Problème**: Le filtre ajoute le rôle sans préfixe `ROLE_`

**Solution**: Ajouter automatiquement le préfixe `ROLE_` pour la cohérence Spring Security

---

## Plan d'Exécution

1. Modifier SecurityConfig pour utiliser `ROLE_DOCTEUR` uniformément
2. Modifier JwtAuthenticationFilter pour ajouter le préfixe ROLE_
3. Ajouter endpoint backend sans ID ou corriger l'appel frontend
4. Tester la connexion et les API

