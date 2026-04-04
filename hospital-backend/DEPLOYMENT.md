# ============================================
# DEPLOYMENT GUIDE - Hospital Backend
# ============================================

## Prérequis pour Render

### Variables d'environnement à configurer sur Render:

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL JDBC PostgreSQL | `jdbc:postgresql://host:5432/hospital_db` |
| `DB_USERNAME` | Nom d'utilisateur DB | `postgres` |
| `DB_PASSWORD` | Mot de passe DB | `votre_mot_de_passe` |
| `JWT_SECRET` | Clé secrète JWT (min 32 caractères) | `MaCleSecreteTresLonguePourJWT...` |
| `JWT_EXPIRATION` | Durée token JWT (ms) | `86400000` |
| `JWT_REFRESH_EXPIRATION` | Durée refresh token (ms) | `604800000` |

### Optionnel:
| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur | `8080` |
| `JPA_DDL_AUTO` | Stratégie Hibernate | `update` |
| `JPA_SHOW_SQL` | Afficher SQL | `false` en prod |

## Commandes de build

```bash
# Build Docker image
docker build -t hospital-backend .

# Run locally with env vars
docker run -p 8080:8080 \
  -e DATABASE_URL=jdbc:postgresql://host:5432/hospital_db \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=password \
  -e JWT_SECRET=your-secret-key \
  hospital-backend
```

## SQL à exécuter avant déploiement

### 1. Mettre à jour la contrainte consultations_status_check:
```sql
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_status_check;
ALTER TABLE consultations ADD CONSTRAINT consultations_status_check 
CHECK (status IN ('EN_ATTENTE', 'CONFIRME', 'CONFIRMED', 'EN_COURS', 'TERMINE',
    'COMPLETED', 'ANNULE', 'CANCELLED', 'ARCHIVED', 'ARRIVED',
    'LABORATOIRE_EN_ATTENTE', 'PHARMACIE_EN_ATTENTE', 'ATTENTE_PAIEMENT_LABO',
    'PENDING_PAYMENT', 'PAID_PENDING_LAB', 'PAID_COMPLETED', 'PAYEE',
    'EXAMENS_PRESCRITS', 'EXAMENS_PAYES', 'AU_LABO', 'RESULTATS_PRETS'));
```

### 2. Mettre à jour la contrainte prescribed_exams_status_check:
```sql
ALTER TABLE prescribed_exams DROP CONSTRAINT IF EXISTS prescribed_exams_status_check;
ALTER TABLE prescribed_exams ADD CONSTRAINT prescribed_exams_status_check 
CHECK (status IN ('PENDING', 'PRESCRIBED', 'ADJUSTED_BY_CASHIER', 'PAID', 
    'PAID_PENDING_LAB', 'IN_PROGRESS', 'COMPLETED', 'RESULTS_AVAILABLE', 
    'DELIVERED_TO_DOCTOR', 'ARCHIVED', 'CANCELLED'));
```

## Health Check Endpoint

Render utilisera:
- URL: `http://localhost:8080/actuator/health`
- Méthode: GET
- Succès: HTTP 200 avec `{"status":"UP"}`

## Vérification post-déploiement

```bash
# Test health check
curl https://votre-app.onrender.com/actuator/health

# Test API
curl https://votre-app.onrender.com/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

## Dépannage

### Erreur MalformedInputException:
→ Vérifier que le fichier `application.properties` est en UTF-8 sans BOM

### Erreur de connexion DB:
→ Vérifier que toutes les variables d'environnement DB sont définies

### Erreur 403/401:
→ Vérifier que `JWT_SECRET` est défini et a au moins 32 caractères
