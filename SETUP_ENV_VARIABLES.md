# 🔐 Configuration des Variables d'Environnement

## Étape 1 : Nettoyer les secrets des fichiers properties

### Remplacer dans TOUS les fichiers application-*.properties :

**Google OAuth2 :**
```properties
# AVANT :
spring.security.oauth2.client.registration.google.client-id=VOTRE_CLIENT_ID.apps.googleusercontent.com
spring.security.oauth2.client.registration.google.client-secret=VOTRE_CLIENT_SECRET

# APRÈS :
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET}
```

**Email :**
```properties
# AVANT :
spring.mail.username=votre-email@gmail.com
spring.mail.password=your-app-password

# APRÈS :
spring.mail.username=${EMAIL_USERNAME}
spring.mail.password=${EMAIL_PASSWORD}
```

**Base de données :**
```properties
# AVANT :
spring.datasource.url=jdbc:postgresql://localhost:5432/hospital_db
spring.datasource.username=postgres
spring.datasource.password=your-password

# APRÈS (pour production) :
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DATABASE_USERNAME}
spring.datasource.password=${DATABASE_PASSWORD}
```

---

## Étape 2 : Configuration sur Render

### 1. Créer un Web Service sur Render

1. Aller sur https://dashboard.render.com
2. Cliquer **"New +"** → **"Web Service"**
3. Connecter ton repo GitHub : `Juifdev20/inua`
4. Sélectionner la branche `main`

### 2. Configuration du Build

**Build Command :**
```bash
cd hospital-backend && ./mvnw clean package -DskipTests
```

**Start Command :**
```bash
cd hospital-backend && java -jar target/hospital-0.0.1-SNAPSHOT.jar
```

### 3. Ajouter les Variables d'Environnement

Dans l'onglet **"Environment"** de ton service Render, ajouter :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `GOOGLE_CLIENT_ID` | `VOTRE_CLIENT_ID.apps.googleusercontent.com` | OAuth2 Google ID |
| `GOOGLE_CLIENT_SECRET` | `VOTRE_CLIENT_SECRET` | OAuth2 Google Secret |
| `EMAIL_USERNAME` | `votre-email@gmail.com` | Email SMTP |
| `EMAIL_PASSWORD` | `your-app-password` | Mot de passe app Gmail |
| `DATABASE_URL` | `jdbc:postgresql://HOST:5432/inuaafya` | URL base de données |
| `DATABASE_USERNAME` | `postgres` | User DB |
| `DATABASE_PASSWORD` | `your-db-password` | Password DB |
| `APP_FRONTEND_URL` | `https://inuaafya.vercel.app` | URL frontend |
| `JWT_SECRET` | `votre-jwt-secret-min-256-bits` | Secret JWT |

### 4. Configuration Base de données PostgreSQL sur Render

1. **New +** → **PostgreSQL**
2. Nommer : `inuaafya-db`
3. Plan : Free (ou starter)
4. Copier l'**Internal Database URL** pour la variable `DATABASE_URL`

---

## Étape 3 : Configuration Frontend (Vercel/Netlify)

### Variables d'environnement Frontend :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `VITE_BACKEND_URL` | `https://inuaafya-api.onrender.com` | URL API backend |
| `VITE_API_BASE_URL` | `https://inuaafya-api.onrender.com` | URL API |

---

## Étape 4 : Nettoyer Git et Recommit

```bash
# 1. Annuler le commit avec secrets
git reset --soft HEAD~1

# 2. Modifier les fichiers (remplacer secrets par ${VAR})
# Éditer : application.properties
# Éditer : application-local.properties  
# Éditer : application-prod.properties

# 3. Ajouter au .gitignore
echo "application-local.properties" >> .gitignore
echo "application-prod.properties" >> .gitignore

# 4. Commit et push
git add .
git commit -m "Sécurisation: utilisation des variables d'environnement pour les secrets"
git push origin main
```

---

## ✅ Vérification Post-Déploiement

1. **Backend démarre** sans erreur sur Render
2. **Frontend build** réussi sur Vercel
3. **Connexion Google** fonctionne
4. **Emails** envoyés correctement
5. **Base de données** accessible

---

## 🔒 Sécurité

- ✅ Plus de secrets dans le code
- ✅ Variables d'environnement sur Render (chiffrées)
- ✅ Git history nettoyée
- ✅ Fichiers .properties ignorés dans .gitignore

---

**Une fois configuré sur Render, l'application sera sécurisée et prête pour la production !** 🚀
