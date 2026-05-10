# 🧪 GUIDE DE TEST - Système de Création Automatique de Comptes

## 🚀 Test Rapide en 5 Minutes

### Prérequis
- Backend démarré (`mvn spring-boot:run`)
- Frontend démarré (`npm run dev`)
- Connecté en tant qu'**Administrateur**

---

## Test 1 : Création d'un Utilisateur Staff

### Étape 1 : Accéder à la page Admin
1. Connectez-vous avec un compte **Admin**
2. Naviguez vers **"Utilisateurs"** dans le menu
3. Cliquez sur **"Nouvel Utilisateur"**

### Étape 2 : Remplir le formulaire
```
Prénom :          Marie
Nom :             Curie
Email :           (laisser vide - sera généré automatiquement)
Téléphone :       +243999999999
Rôle :            DOCTOR
Département :     Cardiologie
```

### Étape 3 : Vérifier la création
- ✅ La modale de succès s'affiche
- ✅ Identifiant affiché : `marie.curie`
- ✅ Mot de passe affiché : `Inua@2026`
- ✅ Boutons "Copier" et "Imprimer" visibles

### Étape 4 : Tester la copie
1. Cliquez sur **"Copier"** à côté de l'identifiant
2. Collez dans un bloc-notes → Doit afficher `marie.curie`
3. Faites de même pour le mot de passe

**Capture d'écran attendue :**
```
┌─────────────────────────────────────┐
│  ✅ Compte créé !                   │
│  Utilisateur staff                  │
│                                     │
│  Compte créé pour                   │
│  Marie Curie                        │
│                                     │
│  IDENTIFIANT        [📋]          │
│  marie.curie                        │
│                                     │
│  MOT DE PASSE TEMP  [📋]          │
│  Inua@2026                          │
│                                     │
│  ⚠️ Changement obligatoire          │
│  [Imprimer] [Fermer]               │
└─────────────────────────────────────┘
```

---

## Test 2 : Connexion avec Nouveau Compte

### Étape 1 : Déconnexion
1. Déconnectez-vous du compte Admin

### Étape 2 : Connexion avec nouveaux identifiants
```
Identifiant : marie.curie
Mot de passe : Inua@2026
```

### Étape 3 : Vérifier le changement forcé
- ✅ Redirection vers la page **"Sécurité requise"**
- ✅ Message : "Changement de mot de passe obligatoire"
- ✅ Formulaire avec 2 champs (Nouveau / Confirmation)
- ✅ Indicateur de force du mot de passe

**Capture d'écran attendue :**
```
┌─────────────────────────────────────┐
│  ⚠️ Sécurité requise                │
│  Changement de mot de passe          │
│                                     │
│  Pour votre sécurité, vous devez     │
│  changer le mot de passe temporaire  │
│                                     │
│  Nouveau mot de passe               │
│  [                ] 👁️               │
│                                     │
│  Confirmer le mot de passe          │
│  [                ] 👁️               │
│                                     │
│  [🔒 Changer le mot de passe]       │
└─────────────────────────────────────┘
```

---

## Test 3 : Validation du Changement de Mot de Passe

### Test 3.1 : Essayer le mot de passe par défaut
```
Nouveau mot de passe : Inua@2026
Confirmer : Inua@2026
```
- ❌ **Erreur attendue** : "Vous devez choisir un mot de passe différent"

### Test 3.2 : Mot de passe trop court
```
Nouveau mot de passe : abc
```
- ❌ **Erreur attendue** : "Minimum 6 caractères requis"

### Test 3.3 : Mot de passe trop simple
```
Nouveau mot de passe : abcdef
```
- ❌ **Erreur attendue** : "Doit contenir au moins 2 types : majuscules, minuscules..."

### Test 3.4 : Non-correspondance
```
Nouveau mot de passe : Password123
Confirmer : Password456
```
- ❌ **Erreur attendue** : "Les mots de passe ne correspondent pas"

### Test 3.5 : Mot de passe valide ✓
```
Nouveau mot de passe : Marie2026!
Confirmer : Marie2026!
```
- ✅ **Succès** : Toast "Mot de passe changé avec succès !"
- ✅ Redirection vers le dashboard Médecin

---

## Test 4 : Création d'un Compte Patient (Réception)

### Étape 1 : Connexion Réception
1. Connectez-vous avec un compte **Réception**

### Étape 2 : Créer un patient
1. Naviguez vers **"Patients"**
2. Cliquez **"Nouveau Patient"**
3. Remplissez :
   ```
   Prénom : Jean
   Nom : Dupont
   Téléphone : +243888888888
   Email : (laisser vide)
   ```
4. Sauvegardez

### Étape 3 : Créer le compte utilisateur
1. Dans la liste des patients, trouvez **Jean Dupont**
2. Cliquez sur **"Créer compte"**
3. ✅ Vérifiez la modale avec :
   - Identifiant : `jean.dupont`
   - Mot de passe : `Inua@2026`

### Étape 4 : Vérifier l'email généré
1. Fermez la modale
2. Rafraîchissez la page
3. Le patient doit avoir l'email : `jean.dupont@inuaafia.local`

---

## Test 5 : Gestion des Doublons

### Étape 1 : Créer un premier utilisateur
```
Prénom : Pierre
Nom : Martin
```
- ✅ Username généré : `pierre.martin`

### Étape 2 : Créer un deuxième utilisateur avec le même nom
```
Prénom : Pierre
Nom : Martin
```
- ✅ Username généré : `pierre.martin1` (incrémentation automatique)

---

## 📊 Checklist de Validation

### Backend
- [ ] `AccountGenerationUtils.generateUniqueUsername()` fonctionne
- [ ] `PasswordChangeController` endpoints accessibles
- [ ] Mot de passe haché en base (vérifier avec pgAdmin)
- [ ] Champ `must_change_password` = true pour nouveaux comptes

### Frontend
- [ ] `SuccessAccountModal` s'affiche correctement
- [ ] Bouton Copier fonctionne
- [ ] Bouton Imprimer génère une page A5
- [ ] `ForcePasswordChange` bloque l'accès au dashboard
- [ ] Validations mot de passe (complexité, correspondance)
- [ ] Redirection après changement réussi

### Intégration
- [ ] `PasswordChangeWrapper` englobe toutes les routes protégées
- [ ] `AuthContext.updateUser()` met à jour le statut
- [ ] Routes API accessibles avec token JWT valide

---

## 🔧 Commandes de Vérification

### Vérifier en base de données
```sql
-- Vérifier la structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('username', 'email', 'must_change_password', 'password');

-- Vérifier un compte créé
SELECT username, email, must_change_password, 
       LEFT(password, 20) as pwd_hash_preview
FROM users 
WHERE username LIKE 'marie.curie%'
ORDER BY created_at DESC 
LIMIT 1;
```

### Vérifier les logs backend
```bash
# Chercher les logs de création
grep -i "account creation\|Compte créé\|Username généré" hospital-backend.log
```

---

## ⚠️ Problèmes Courants et Solutions

### Problème 1 : La modale ne s'affiche pas
**Cause :** L'API retourne une erreur
**Solution :** 
```javascript
// Vérifier la console navigateur (F12)
// Chercher l'appel à /api/account-creation/staff
// Vérifier le statut HTTP et le message d'erreur
```

### Problème 2 : Mot de passe non haché
**Cause :** PasswordEncoder non injecté
**Solution :** Vérifier que `PasswordConfig` existe avec `@Bean public PasswordEncoder passwordEncoder()`

### Problème 3 : `mustChangePassword` toujours null
**Cause :** Migration SQL non exécutée
**Solution :** 
```bash
# Relancer Flyway
mvn flyway:repair
mvn flyway:migrate
```

---

## 🎊 Validation Finale

Si tous les tests ci-dessus passent :
- ✅ Le système est **PRÊT POUR LA PRODUCTION**
- ✅ Les patients peuvent recevoir leurs identifiants
- ✅ La sécurité est garantie (changement forcé)

**Prochaine étape :** Déployer et former le personnel de réception ! 🚀
