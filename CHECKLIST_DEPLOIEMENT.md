# ✅ Checklist de Déploiement - Automatisation Comptes Utilisateurs

## 🎯 Résumé : Tout est créé, 3 étapes manuelles restantes

---

## ✅ ÉTAPE 1 : Remplacer Users.jsx (30 secondes)

### Action
Copier le fichier intégré dans le fichier original :

```powershell
# Windows PowerShell
Copy-Item "C:\Users\dieud\Desktop\Inua\hospi-frontend\src\pages\admin\Users_Integrated.jsx" "C:\Users\dieud\Desktop\Inua\hospi-frontend\src\pages\admin\Users.jsx" -Force
```

Ou manuellement :
1. Ouvrir `Users_Integrated.jsx`
2. Sélectionner tout (Ctrl+A)
3. Copier (Ctrl+C)
4. Ouvrir `Users.jsx`
5. Coller (Ctrl+V)
6. Sauvegarder (Ctrl+S)

### Vérification
- [ ] Le fichier `Users.jsx` contient maintenant les imports `accountCreationApi` et `SuccessAccountModal`
- [ ] La fonction `handleSubmit` appelle `accountCreationApi.createStaffAccount()`
- [ ] La modale `SuccessAccountModal` est présente dans le rendu

---

## ✅ ÉTAPE 2 : Modifier App.jsx (2 minutes)

### Action 2.1 : Ajouter l'import

En haut de `src/App.jsx`, ajoutez :

```javascript
// ★ IMPORT POUR VÉRIFICATION MOT DE PASSE OBLIGATOIRE
import PasswordChangeWrapper from './components/auth/PasswordChangeWrapper';
```

### Action 2.2 : Modifier les routes protégées

Pour chaque route protégée, ajoutez `<PasswordChangeWrapper>` :

#### Route Admin
```javascript
// Trouver cette ligne :
<Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>

// Remplacer par :
<Route path="/admin" element={
  <AdminRoute>
    <PasswordChangeWrapper>
      <AdminLayout />
    </PasswordChangeWrapper>
  </AdminRoute>
}>
```

#### Route Doctor
```javascript
// Trouver :
<Route path="/doctor" element={<AdminRoute><DoctorLayout /></AdminRoute>}>

// Remplacer par :
<Route path="/doctor" element={
  <AdminRoute>
    <PasswordChangeWrapper>
      <DoctorLayout />
    </PasswordChangeWrapper>
  </AdminRoute>
}>
```

#### Route Reception
```javascript
// Trouver :
<Route path="/reception" element={<ReceptionRoute><ReceptionLayout /></ReceptionRoute>}>

// Remplacer par :
<Route path="/reception" element={
  <ReceptionRoute>
    <PasswordChangeWrapper>
      <ReceptionLayout />
    </PasswordChangeWrapper>
  </ReceptionRoute>
}>
```

#### Route Finance
```javascript
// Trouver :
<Route path="/finance" element={<FinanceRoute><FinanceLayout /></FinanceRoute>}>

// Remplacer par :
<Route path="/finance" element={
  <FinanceRoute>
    <PasswordChangeWrapper>
      <FinanceLayout />
    </PasswordChangeWrapper>
  </FinanceRoute>
}>
```

#### Route Patient
```javascript
// Trouver :
<Route path="/patient" element={<PatientRoute><PatientLayout /></PatientRoute>}>

// Remplacer par :
<Route path="/patient" element={
  <PatientRoute>
    <PasswordChangeWrapper>
      <PatientLayout />
    </PasswordChangeWrapper>
  </PatientRoute>
}>
```

### ⚠️ IMPORTANT : Ne PAS modifier les routes publiques

Ces routes restent inchangées :
- `/` (Landing)
- `/login`
- `/register`
- `/forgot-password`

### Vérification
- [ ] L'import `PasswordChangeWrapper` est ajouté en haut du fichier
- [ ] Toutes les routes protégées sont enveloppées avec `<PasswordChangeWrapper>`
- [ ] Les routes publiques (`/login`, `/register`) ne sont PAS modifiées

---

## ✅ ÉTAPE 3 : Mettre à jour la Base de Données (1 minute)

### Action

Exécuter le fichier SQL sur votre base de données MySQL/PostgreSQL :

```bash
# MySQL
mysql -u votre_user -p votre_base_de_donnees < MIGRATION_AUTO_ACCOUNT.sql

# PostgreSQL
psql -U votre_user -d votre_base_de_donnees -f MIGRATION_AUTO_ACCOUNT.sql
```

Ou via un outil graphique (phpMyAdmin, pgAdmin, etc.) :
1. Ouvrir `MIGRATION_AUTO_ACCOUNT.sql`
2. Copier tout le contenu
3. Coller dans l'outil SQL
4. Exécuter

### Vérification

```sql
-- Vérifier que la colonne existe
DESCRIBE users;

-- Vérifier les valeurs
SELECT must_change_password, COUNT(*) 
FROM users 
GROUP BY must_change_password;

-- Résultat attendu :
-- must_change_password | COUNT
-- FALSE                | N (users existants)
-- TRUE                 | 0
```

- [ ] Colonne `must_change_password` ajoutée
- [ ] Colonne `email` est nullable
- [ ] Tous les users existants ont `must_change_password = FALSE`

---

## ✅ ÉTAPE 4 : Compiler et Déployer le Backend

### Action

```bash
cd C:\Users\dieud\Desktop\Inua\hospital-backend

# Compiler
mvn clean install

# Si pas d'erreurs, déployer sur votre serveur
# (copier le .jar ou déployer selon votre procédure)
```

### Vérification
- [ ] Compilation réussie (`BUILD SUCCESS`)
- [ ] Backend déployé et démarré
- [ ] Endpoints accessibles :
  - `GET /api/account-creation/check-username`
  - `POST /api/account-creation/staff`

---

## ✅ ÉTAPE 5 : Compiler et Déployer le Frontend

### Action

```bash
cd C:\Users\dieud\Desktop\Inua\hospi-frontend

# Installer dépendances (si pas déjà fait)
npm install

# Compiler
npm run build

# Déployer (selon votre hébergement)
```

### Vérification
- [ ] Compilation réussie sans erreurs
- [ ] Frontend déployé

---

## 🧪 Tests de Validation

### Test 1 : Création utilisateur staff
- [ ] Aller dans Admin → Utilisateurs
- [ ] Cliquer "Nouvel Utilisateur"
- [ ] Remplir : Prénom = "Test", Nom = "User", Email = vide
- [ ] Cliquer "Créer"
- [ ] ✅ Modale affiche username et mot de passe

### Test 2 : Copier les credentials
- [ ] Cliquer "Copier les identifiants"
- [ ] ✅ Toast "Copié dans le presse-papier !"

### Test 3 : Login avec nouveau compte
- [ ] Se déconnecter
- [ ] Se connecter avec le username et mot de passe affichés
- [ ] ✅ Formulaire de changement de mot de passe s'affiche

### Test 4 : Changement mot de passe
- [ ] Remplir nouveau mot de passe (ex: "MonNouveauMdp123!")
- [ ] Confirmer le mot de passe
- [ ] Cliquer "Changer le mot de passe"
- [ ] ✅ Redirection vers le dashboard

### Test 5 : Vérification changement
- [ ] Se déconnecter
- [ ] Essayer de se connecter avec l'ancien mot de passe
- [ ] ✅ Erreur "Mot de passe incorrect"
- [ ] Se connecter avec le nouveau mot de passe
- [ ] ✅ Accès direct au dashboard (pas de formulaire de changement)

### Test 6 : Création patient avec compte
- [ ] Aller dans Réception
- [ ] Trouver un patient sans compte
- [ ] Cliquer "Créer compte"
- [ ] ✅ Modale affiche les credentials générés

---

## 📋 Résumé des actions

| # | Action | Fichier/Dossier | Temps estimé | Statut |
|---|--------|-----------------|--------------|--------|
| 1 | Remplacer Users.jsx | `src/pages/admin/Users.jsx` | 30s | ⬜ À faire |
| 2 | Modifier App.jsx | `src/App.jsx` | 2min | ⬜ À faire |
| 3 | Exécuter migration SQL | Base de données | 1min | ⬜ À faire |
| 4 | Compiler backend | `hospital-backend/` | 2min | ⬜ À faire |
| 5 | Compiler frontend | `hospi-frontend/` | 2min | ⬜ À faire |
| 6 | Tests | Application | 5min | ⬜ À faire |

**Total : ~13 minutes**

---

## 🆘 En cas de problème

### Erreur "Cannot find module"
```bash
cd hospi-frontend
npm install
```

### Erreur compilation backend
```bash
cd hospital-backend
mvn clean
mvn install -DskipTests
```

### La modale ne s'affiche pas
- Vérifier que `Users.jsx` a bien été remplacé
- Vérifier que `accountCreationApi.js` existe
- Vérifier que `SuccessAccountModal.jsx` existe

### Le formulaire de changement MDP ne s'affiche pas
- Vérifier que `App.jsx` a bien été modifié avec `PasswordChangeWrapper`
- Vérifier que `AuthContext.jsx` contient `mustChangePassword`
- Vérifier que la colonne `must_change_password` existe en BDD

### Mot de passe par défaut ne fonctionne pas
- Vérifier que le backend est compilé avec les nouveaux fichiers
- Vérifier que `AccountGenerationUtils.java` utilise le bon mot de passe

---

## 🎉 C'est terminé !

Après ces 3 étapes manuelles + compilation, l'automatisation des comptes utilisateurs sera complètement fonctionnelle !

**Documentation complète disponible dans :**
- `AUTO_ACCOUNT_CREATION_GUIDE.md` - Guide détaillé
- `RESUME_IMPLEMENTATION.md` - Résumé technique
- `MIGRATION_AUTO_ACCOUNT.sql` - Script base de données
