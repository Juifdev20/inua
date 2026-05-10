# TODO - Paramètres Réception: Synchronisation DB, Header et Sécurité

## Phase 1: Backend Java - Sécurité & Profil ✅ TERMINÉ

### 1.1 ReceptionController - Nouveaux endpoints ✅
- [x] PUT `/api/v1/reception/profile/password` - Changement mot de passe avec BCrypt
- [x] POST `/api/v1/reception/profile/avatar` - Upload avatar vers /uploads/avatars/
- [x] PUT `/api/v1/reception/profile/update` - Mise à jour infos (fullName, phone)

## Phase 2: Frontend - AuthContext ✅
- [x] Fonction `updateUser()` déjà existante - permet de mettre à jour le contexte global
- [x] Synchronisation fullName et avatarUrl via updateUser()

## Phase 3: Frontend - Header.jsx ✅
- [x] Affichage de user.firstName et user.lastName 
- [x] Affichage de user.photoUrl avec object-cover
- [x] Support des chemins uploads/profiles et uploads/avatars

## Phase 4: Frontend - Settings.jsx ✅
### 4.1 Formulaire Profil ✅
- [x] Chargement des données utilisateur existantes
- [x] Appel API pour sauvegarder fullName et phone
- [x] Mise à jour du AuthContext après sauvegarde

### 4.2 Formulaire Sécurité (Mot de passe) ✅
- [x] Validation: nouveau mot de passe différent de l'ancien
- [x] Validation: confirmation correspond au nouveau mot de passe
- [x] Appel API PUT avec ancienPassword, nouveauPassword
- [x] Affichage erreur si ancien mot de passe incorrect

### 4.3 Upload Avatar ✅
- [x] Input file caché
- [x] Envoi via FormData à l'API
- [x] Mise à jour du Header via AuthContext

## Phase 5: Services Frontend ✅
- [x] add_file fonctions API pour:
  - changePassword(id, oldPwd, newPwd)
  - uploadAvatar(file)
  - updateReceptionProfile(data)

---

## FONCTIONNALITÉS IMPLEMENTÉES

### Backend (Java)
1. **Changement de mot de passe** (`PUT /api/v1/reception/profile/password`)
   - Vérifie l'ancien mot de passe avec BCrypt
   - Encode le nouveau mot de passe
   - Retourne erreur si ancien mot de passe incorrect

2. **Upload Avatar** (`POST /api/v1/reception/profile/avatar`)
   - Sauvegarde l'image dans /uploads/avatars/
   - Met à jour profile_picture_url de l'utilisateur

3. **Mise à jour Profil** (`PUT /api/v1/reception/profile/update`)
   - Permet de modifier firstName, lastName, phoneNumber

### Frontend (React)
1. **Settings.jsx complet avec:**
   - Formulaire de profil (prénom, nom, téléphone)
   - Upload d'avatar avec prévisualisation
   - Changement de mot de passe avec validations
   - Messages de succès/erreur

2. **Header.jsx**
   - Affichage dynamique du nom et photo
   - Support des deux chemins d'avatar

3. **AuthContext**
   - Fonction updateUser() pour la mise à jour globale

