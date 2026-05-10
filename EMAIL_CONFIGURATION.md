# 📧 Configuration Email - Inua Afia

## Configuration application.properties

Ajoutez ces lignes à votre fichier `application.properties` :

```properties
# ===============================
# ★ CONFIGURATION EMAIL (SMTP)
# ===============================

# Gmail (recommandé pour le développement)
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=votre.email@gmail.com
spring.mail.password=votre_mot_de_passe_application
spring.mail.protocol=smtp
spring.mail.default-encoding=UTF-8

# Propriétés SMTP
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true
spring.mail.properties.mail.smtp.connectiontimeout=5000
spring.mail.properties.mail.smtp.timeout=5000
spring.mail.properties.mail.smtp.writetimeout=5000

# ===============================
# ★ CONFIGURATION ASYNC (pour @Async)
# ===============================
spring.task.execution.pool.core-size=5
spring.task.execution.pool.max-size=10
spring.task.execution.pool.queue-capacity=100
spring.task.execution.thread-name-prefix=email-task-

# ===============================
# ★ CONFIGURATION APPLICATION
# ===============================
app.name=Inua Afia
app.frontend-url=http://localhost:5173
```

---

## 🔐 Configuration Gmail (Mot de passe d'application)

### Étape 1 : Activer l'authentification à 2 facteurs
1. Allez sur https://myaccount.google.com/
2. Sécurité → Validation en 2 étapes → Activer

### Étape 2 : Créer un mot de passe d'application
1. Sécurité → Mots de passe d'application
2. Sélectionner "Autre (nom personnalisé)"
3. Nommer : "Inua Afia Hospital"
4. Copier le mot de passe généré (16 caractères)
5. Coller dans `spring.mail.password`

---

## 🆓 Alternatives gratuites pour la production

### Option 1 : SendGrid (100 emails/jour gratuits)
```properties
spring.mail.host=smtp.sendgrid.net
spring.mail.port=587
spring.mail.username=apikey
spring.mail.password=SG.votre_cle_api_sendgrid
```

### Option 2 : Mailgun (gratuit jusqu'à 5000 emails/mois)
```properties
spring.mail.host=smtp.mailgun.org
spring.mail.port=587
spring.mail.username=postmaster@votre_domaine.mailgun.org
spring.mail.password=votre_mot_de_passe_mailgun
```

### Option 3 : SMTP de votre hébergeur

**OVH :**
```properties
spring.mail.host=ssl0.ovh.net
spring.mail.port=587
spring.mail.username=votre@email.com
spring.mail.password=votre_mot_de_passe
```

**AlwaysData (gratuit) :**
```properties
spring.mail.host=smtp-votre_compte.alwaysdata.net
spring.mail.port=587
spring.mail.username=votre@email.com
spring.mail.password=votre_mot_de_passe
```

---

## 🧪 Tester la configuration

### Test via l'API
```bash
curl -X POST http://localhost:8080/api/email/test \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "votre.email@example.com"}'
```

### Test via Swagger
1. Démarrer l'application
2. Aller sur http://localhost:8080/swagger-ui.html
3. Rechercher "Email Service"
4. Tester l'endpoint `/api/email/test`

---

## ⚠️ Notes importantes

1. **Port 587 vs 465** : Utilisez 587 avec STARTTLS (recommandé) ou 465 avec SSL
2. **Firewall** : Vérifiez que le port SMTP n'est pas bloqué
3. **Spam** : Certains fournisseurs marquent les emails comme spam - utilisez un vrai domaine en production
4. **Limites Gmail** : 100 emails/jour pour les comptes gratuits

---

## 🔧 Dépannage

### Erreur "Authentication failed"
- Vérifiez le mot de passe d'application Gmail
- Assurez-vous que l'authentification à 2 facteurs est activée

### Erreur "Connection refused"
- Vérifiez le firewall
- Essayez avec/without VPN
- Vérifiez que l'host SMTP est correct

### Emails dans les spam
- Ajoutez un enregistrement SPF dans votre DNS
- Utilisez un vrai nom de domaine
- Demandez aux utilisateurs d'ajouter l'expéditeur à leurs contacts
