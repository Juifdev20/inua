# 🗺️ Carte des Fichiers - Automatisation Comptes Utilisateurs

## 📁 Structure complète des fichiers créés

```
Inua/
│
├── 📄 DOCUMENTATION (à la racine)
│   ├── AUTO_ACCOUNT_CREATION_GUIDE.md    ← Guide complet d'utilisation
│   ├── LIVRABLES_AUTO_ACCOUNT.md           ← Liste des fichiers créés
│   ├── INTEGRATION_DIRECTE.md            ← Instructions rapides
│   ├── APP_JSX_INTEGRATION.md            ← Guide modification App.jsx
│   ├── RESUME_IMPLEMENTATION.md          ← Résumé technique
│   ├── CHECKLIST_DEPLOIEMENT.md          ← Checklist étape par étape
│   ├── CARTE_FICHIERS.md                 ← Ce fichier
│   └── MIGRATION_AUTO_ACCOUNT.sql        ← Script base de données
│
├── 🏥 hospital-backend/
│   └── src/
│       └── main/
│           └── java/
│               └── com/hospital/backend/
│                   ├── util/
│                   │   └── AccountGenerationUtils.java      ← Génération username
│                   ├── controller/
│                   │   ├── AccountCreationController.java   ← API création staff/patient
│                   │   └── PasswordChangeController.java    ← API changement MDP
│                   ├── entity/
│                   │   └── User.java                        ← +mustChangePassword
│                   └── dto/
│                       └── UserDTO.java                     ← +mustChangePassword
│
└── 💻 hospi-frontend/
    └── src/
        ├── components/auth/
        │   ├── SuccessAccountModal.jsx      ← Modale credentials générés
        │   ├── ForcePasswordChange.jsx      ← Formulaire changement MDP
        │   └── PasswordChangeWrapper.jsx    ← Wrapper vérification MDP
        │
        ├── services/
        │   └── accountCreationApi.js        ← Service API création comptes
        │
        ├── pages/admin/
        │   ├── Users.jsx                    ← ← ← À REMPLACER
        │   └── Users_Integrated.jsx         ← ← ← NOUVEAU (prêt à l'emploi)
        │
        └── context/
            └── AuthContext.jsx              ← Modifié (+mustChangePassword)
```

---

## 🎯 Fichiers clés par fonctionnalité

### 🎨 Interface utilisateur
| Composant | Chemin | Fonction |
|-----------|--------|----------|
| **SuccessAccountModal** | `components/auth/SuccessAccountModal.jsx` | Affiche username + password après création |
| **ForcePasswordChange** | `components/auth/ForcePasswordChange.jsx` | Formulaire changement MDP obligatoire |
| **PasswordChangeWrapper** | `components/auth/PasswordChangeWrapper.jsx` | Bloque dashboard si changement requis |
| **Users_Integrated** | `pages/admin/Users_Integrated.jsx` | Page admin complète avec auto-création |

### ⚙️ Logique métier
| Service | Chemin | Fonction |
|---------|--------|----------|
| **accountCreationApi** | `services/accountCreationApi.js` | Appels API création/vérification |
| **AuthContext** | `context/AuthContext.jsx` | Gestion état auth + mustChangePassword |

### 🔧 Backend
| Classe | Chemin | Fonction |
|--------|--------|----------|
| **AccountGenerationUtils** | `util/AccountGenerationUtils.java` | Génère usernames uniques |
| **AccountCreationController** | `controller/AccountCreationController.java` | Endpoints REST création |
| **PasswordChangeController** | `controller/PasswordChangeController.java` | Endpoints REST changement MDP |
| **User** | `entity/User.java` | Entité avec mustChangePassword |
| **UserDTO** | `dto/UserDTO.java` | DTO avec mustChangePassword |

---

## 🔗 Flux de données

```
1. CRÉATION UTILISATEUR (Admin)
   Users.jsx → accountCreationApi.createStaffAccount()
      ↓
   POST /api/account-creation/staff
      ↓
   AccountCreationController
      ↓
   AccountGenerationUtils.generateUniqueUsername()
      ↓
   UserRepository.save()
      ↓
   Réponse JSON : { username, generatedPassword, ... }
      ↓
   SuccessAccountModal (affichage credentials)

2. PREMIER LOGIN
   LoginPage → AuthContext.login()
      ↓
   POST /api/auth/login
      ↓
   Réponse : { ..., mustChangePassword: true }
      ↓
   AuthContext → mustChangePassword = true
      ↓
   PasswordChangeWrapper
      ↓
   ForcePasswordChange (affichage formulaire)
      ↓
   POST /api/password/force-change
      ↓
   PasswordChangeController
      ↓
   mustChangePassword = false
      ↓
   Redirection dashboard
```

---

## 📝 Points d'intégration manuels

### 1. Remplacer Users.jsx
```
AVANT  : src/pages/admin/Users.jsx (ancienne version)
APRÈS  : src/pages/admin/Users_Integrated.jsx (nouvelle version)
```

### 2. Modifier App.jsx
```
EMPLACEMENT : src/App.jsx

MODIFICATION : Envelopper chaque route protégée avec <PasswordChangeWrapper>

ROUTES À MODIFIER :
- /admin/*
- /doctor/*
- /reception/*
- /finance/*
- /patient/*
- /laboratory/*
- /pharmacy/*
```

### 3. Base de données
```
FICHIER : MIGRATION_AUTO_ACCOUNT.sql

ACTIONS SQL :
- ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT TRUE
- ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL
```

---

## 🧪 Tests après déploiement

| Test | Où ? | Attendu |
|------|------|---------|
| Créer utilisateur | Admin → Users → Nouvel Utilisateur | Modale avec credentials |
| Copier credentials | Modale → Bouton "Copier" | Toast "Copié !" |
| Premier login | Login avec nouveau compte | Formulaire changement MDP |
| Changer MDP | Formulaire → Nouveau MDP | Redirection dashboard |
| Login suivant | Avec nouveau MDP | Accès direct dashboard |

---

## 📞 Support & Dépannage

### Problème : Modale ne s'affiche pas
**Cause** : Users.jsx pas remplacé ou fichier manquant
**Solution** : Vérifier que `Users_Integrated.jsx` remplace bien `Users.jsx`

### Problème : Formulaire changement MDP ne s'affiche pas
**Cause** : App.jsx pas modifié ou AuthContext incomplet
**Solution** : Vérifier `PasswordChangeWrapper` dans App.jsx et `mustChangePassword` dans AuthContext

### Problème : Username pas généré
**Cause** : Backend pas compilé ou erreur BDD
**Solution** : Vérifier logs backend, vérifier colonne `must_change_password` existe

### Problème : Email obligatoire alors qu'il devrait être optionnel
**Cause** : Migration SQL pas exécutée
**Solution** : Exécuter `MIGRATION_AUTO_ACCOUNT.sql`

---

## ✅ Statut global

| Composant | Statut | Emplacement |
|-----------|--------|-------------|
| Backend API | ✅ Créé | `hospital-backend/src/...` |
| Frontend UI | ✅ Créé | `hospi-frontend/src/components/auth/` |
| Users.jsx intégré | ✅ Créé | `hospi-frontend/src/pages/admin/Users_Integrated.jsx` |
| AuthContext modifié | ✅ Modifié | `hospi-frontend/src/context/AuthContext.jsx` |
| Documentation | ✅ Créée | Fichiers `.md` à la racine |
| Migration SQL | ✅ Créée | `MIGRATION_AUTO_ACCOUNT.sql` |
| **Remplacer Users.jsx** | ⬜ À faire | Copier vers `src/pages/admin/Users.jsx` |
| **Modifier App.jsx** | ⬜ À faire | Ajouter `PasswordChangeWrapper` |
| **Exécuter SQL** | ⬜ À faire | Sur base de données |

---

**🎉 Tous les fichiers sont créés et prêts !**
**Il ne reste que 3 étapes manuelles simples à réaliser.**

Documentation détaillée : `CHECKLIST_DEPLOIEMENT.md`
