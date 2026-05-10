# ✅ CHECKLIST DÉPLOIEMENT - Inua Afia

## 🔐 Sécurité - Réinitialisation de mot de passe

### ⚠️ Token de réinitialisation (Sécurité renforcée)

**Configuration actuelle (sécurité maximale):**
- ⏱️ **Expiration**: 10 minutes uniquement (au lieu de 24h)
- 🗑️ **Invalidation**: Token supprimé immédiatement après utilisation
- 🔒 **Usage unique**: Un token ne peut être utilisé qu'une seule fois

**Messages utilisateur:**
- Email: "Ce lien est valable pendant **10 minutes** uniquement"
- Frontend: "Lien sécurisé • Valide 10 minutes"
- Erreur token: "Ce lien est manquant, expiré (10 min) ou déjà utilisé"

## 🔐 Configuration Email (Mot de passe oublié)

### Option 1: Gmail SMTP (Recommandé pour la production)

1. **Activer la 2FA** sur le compte Gmail
2. **Créer un mot de passe d'application** sur https://myaccount.google.com/apppasswords
3. **Configurer les variables d'environnement** sur Render/Heroku/VPS:

```bash
# SMTP Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=maestrodieudonne964@gmail.com
MAIL_PASSWORD=qqcjusopjgyfvxiw
MAIL_FROM=maestrodieudonne964@gmail.com

# Frontend URL (important pour les liens de réinitialisation)
FRONTEND_URL=https://inua-afya.onrender.com
```

### Option 2: SendGrid (Alternative professionnelle)

```bash
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=votre-clé-api-sendgrid
MAIL_FROM=noreply@inuaafia.com
```

## 🗄️ Base de Données

- [ ] Créer la base PostgreSQL sur Render/Supabase/AWS RDS
- [ ] Configurer `DATABASE_URL` ou:
  ```bash
  DB_HOST=your-db-host
  DB_PORT=5432
  DB_NAME=hospital_db
  DB_USERNAME=your-username
  DB_PASSWORD=your-password
  ```
- [ ] Vérifier que Flyway migrations s'exécutent au démarrage

## 🔧 Variables d'environnement Backend (application-prod.properties)

```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://host:5432/hospital_db
SPRING_DATASOURCE_USERNAME=username
SPRING_DATASOURCE_PASSWORD=password

# JWT
JWT_SECRET=votre-secret-jwt-tres-long-et-complexe-minimum-256-bits
JWT_EXPIRATION=86400000

# Email (voir ci-dessus)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-email@gmail.com

# Frontend (IMPORTANT pour les liens de reset-password)
FRONTEND_URL=https://votre-frontend.com

# CORS (si différent du frontend)
CORS_ALLOWED_ORIGINS=https://votre-frontend.com
```

## 🌐 Variables d'environnement Frontend

Créer `.env.production`:

```bash
VITE_API_URL=https://votre-backend.com/api
VITE_WS_URL=wss://votre-backend.com/ws
```

## ✅ Tests avant déploiement

### 1. Test réinitialisation mot de passe (LOCAL)
```bash
# Démarrez le backend
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Testez:
# 1. Aller sur http://localhost:5173/forgot-password
# 2. Entrer un email existant: dmjconcept351@gmail.com
# 3. Vérifier que l'email est reçu avec le lien correct
# 4. Cliquer le lien et réinitialiser le mot de passe
# 5. Vérifier la connexion avec le nouveau mot de passe
```

### 4. Test sécurité token (10 minutes)
```bash
# 1. Demander un reset-password
# 2. Attendre 10 minutes (ou modifier la BDD pour tester)
# 3. Essayer d'utiliser le lien après expiration
# Doit afficher: "Token expiré" ou "Lien invalide"

# 4. Test usage unique:
# - Utiliser le lien une première fois (succès)
# - Réessayer avec le même lien
# Doit afficher: "Token invalide" (car déjà utilisé)
```

### 2. Test validation email unique
```bash
# Essayer de créer deux comptes avec le même email
# Doit afficher: "Cet email est déjà utilisé par un autre compte"
```

### 3. Test format email invalide
```bash
# Essayer forgot-password avec: "invalid-email"
# Doit afficher: "Format d'email invalide"

# Essayer forgot-password avec email inexistant
# Doit afficher: "Aucun compte n'est associé à cet email"
```

## 🚀 Déploiement Render (Backend)

1. **Créer Web Service** sur Render
2. **Configurer Build Command**:
   ```bash
   ./mvnw clean package -DskipTests
   ```
3. **Start Command**:
   ```bash
   java -jar target/hospital-backend-*.jar --spring.profiles.active=prod
   ```
4. **Ajouter toutes les variables d'environnement** (voir ci-dessus)
5. **Vérifier les logs au démarrage**:
   - Rechercher: `✅ [SMTP HEALTH CHECK] CONNEXION SMTP RÉUSSIE`
   - Si échec SMTP, vérifier les credentials Gmail

## 🌐 Déploiement Render (Frontend)

1. **Créer Static Site** sur Render
2. **Build Command**:
   ```bash
   npm install && npm run build
   ```
3. **Publish Directory**: `dist`
4. **Variables d'environnement**:
   ```bash
   VITE_API_URL=https://votre-backend.onrender.com/api
   ```

## 📋 Vérifications post-déploiement

- [ ] Backend démarré sans erreurs
- [ ] SMTP Health Check: `✅ CONNEXION SMTP RÉUSSIE` dans les logs
- [ ] Frontend accessible
- [ ] Connexion utilisateur fonctionne
- [ ] Réinitialisation mot de passe fonctionne (test avec vrai email)
- [ ] Email reçu avec lien correct (pointant vers le frontend de production)
- [ ] Lien de réinitialisation fonctionne
- [ ] Nouveau mot de passe permet la connexion

## 🚨 Dépannage courant

### Erreur SMTP "Authentication Failed"
- Vérifier que le mot de passe est un **mot de passe d'application** (pas le mot de passe Gmail normal)
- Vérifier que la **2FA est activée** sur le compte Gmail
- Régénérer un nouveau mot de passe d'application si nécessaire

### Liens de réinitialisation pointent vers localhost
- Vérifier que `FRONTEND_URL` est configuré avec l'URL de production
- Redémarrer le backend après modification

### Email envoyé mais non reçu
- Vérifier les spam/junk mail
- Tester avec Gmail SMTP (plus fiable que SendGrid gratuit)
- Vérifier les logs backend pour les erreurs d'envoi

## 📞 Support

Si problèmes persistants:
1. Vérifier les logs backend complets
2. Tester SMTP avec `SmtpHealthCheck` au démarrage
3. Vérifier la configuration DNS/domaine si emails bloqués
