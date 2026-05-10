# 🚀 CHECKLIST DÉPLOIEMENT - INUA AFYA

## ✅ ÉTAT ACTUEL

### Frontend (React)
- ✅ Build réussi (`npm run build`)
- ✅ Logo mis à jour (vert)
- ✅ Bouton Facebook masqué
- ✅ Scroll activé sur login/register
- ✅ Favicon mis à jour

### Backend (Spring Boot)
- ⚠️ Maven non installé localement (build à faire sur serveur)
- ⚠️ Configuration Facebook encore présente

---

## 🔧 ACTIONS AVANT DÉPLOIEMENT

### 1. Backend - application.properties
**Fichier :** `src/main/resources/application-prod.properties`

**Modifications nécessaires :**
```properties
# Désactiver Facebook temporairement (jusqu'à ce que l'app soit créée)
# spring.security.oauth2.client.registration.facebook.client-id=...
# spring.security.oauth2.client.registration.facebook.client-secret=...

# OU configurer avec variables d'environnement
spring.security.oauth2.client.registration.facebook.client-id=${FACEBOOK_CLIENT_ID:}
spring.security.oauth2.client.registration.facebook.client-secret=${FACEBOOK_CLIENT_SECRET:}
```

### 2. Base de données
**Option A : Migration Flyway automatique**
- Les migrations s'exécutent automatiquement au démarrage
- Vérifier que `spring.flyway.enabled=true`

**Option B : Mise à jour manuelle**
Exécuter ces requêtes SQL sur la base de production :
```sql
-- Mettre à jour les paramètres et notifications
UPDATE settings SET value = 'Inua Afya' WHERE value LIKE '%Inua Afia%';
UPDATE notifications SET message = REPLACE(message, 'Inua Afia', 'Inua Afya');

-- Mettre à jour les templates email
UPDATE email_templates SET subject = REPLACE(subject, 'Inua Afia', 'Inua Afya');
UPDATE email_templates SET body = REPLACE(body, 'Inua Afia', 'Inua Afya');
```

### 3. Frontend - Variables d'environnement
**Fichier :** `.env.production`
```
VITE_BACKEND_URL=https://api.inuaafya.com
VITE_API_BASE_URL=https://api.inuaafya.com
```

---

## 🚀 ÉTAPES DE DÉPLOIEMENT

### Étape 1 : Backend (Render/Heroku/VM)
```bash
cd hospital-backend
mvn clean package -DskipTests
# Uploader le JAR sur le serveur
java -jar target/hospital-0.0.1-SNAPSHOT.jar
```

### Étape 2 : Frontend (Netlify/Vercel/Render)
```bash
cd hospi-frontend
npm run build
# Uploader le dossier 'dist' sur la plateforme
```

### Étape 3 : Vérification
- [ ] Backend démarre sans erreur
- [ ] Frontend affiche le nouveau logo vert
- [ ] Connexion Google fonctionne
- [ ] Connexion Email/OTP fonctionne
- [ ] Base de données accessible

---

## ⚠️ POINTS DE VIGILANCE

1. **Facebook OAuth2**
   - Actuellement désactivé dans le frontend
   - À configurer plus tard avec App ID valide
   - Pour l'instant : Google + Email suffisent

2. **Base de données**
   - Sauvegarder avant migration
   - Vérifier les données après migration

3. **Emails**
   - Vérifier les templates utilisent "Inua Afya"
   - Tester l'envoi d'email

4. **Fichiers statiques**
   - Logo SVG dans `/public`
   - Favicon PNG dans `/public/icons`

---

## 📋 CONFIGURATION PRODUCTION

### application-prod.properties
```properties
# Base de données
spring.datasource.url=jdbc:postgresql://HOST:5432/inuaafya_prod
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}

# Frontend URL
app.frontend-url=https://inuaafya.com

# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET}
spring.security.oauth2.client.registration.google.redirect-uri=https://api.inuaafya.com/login/oauth2/code/google

# Email
app.email.from=noreply@inuaafya.com
spring.mail.host=smtp.gmail.com
spring.mail.username=${EMAIL_USERNAME}
spring.mail.password=${EMAIL_PASSWORD}
```

---

## 🎯 PROCHAINES ÉTAPES POST-DÉPLOIEMENT

1. Créer l'app Facebook
2. Configurer Facebook OAuth2 (backend + frontend)
3. Activer le bouton Facebook
4. Tester l'intégration complète

---

**Statut :** 🟡 Prêt pour déploiement (avec Google uniquement)
