# 🚀 Guide d'Intégration - Automatisation des Comptes Utilisateurs (Inua Afia)

## 📋 Vue d'ensemble

Ce guide explique comment intégrer la création automatique de comptes utilisateurs dans votre application Inua Afia.

### ✅ Fonctionnalités implémentées

1. **Génération automatique d'identifiants** : `prenom.nom` format avec unicité garantie
2. **Mot de passe par défaut** : `Inua@2026` avec hachage BCrypt
3. **Changement de mot de passe obligatoire** au premier login
4. **Modale de succès** affichant les credentials générés
5. **Support patients sans email** : email optionnel (nullable)

---

## 🔧 Backend (Spring Boot 3)

### 1. Fichiers créés

| Fichier | Description |
|---------|-------------|
| `AccountGenerationUtils.java` | Utilitaire de génération de username unique |
| `AccountCreationController.java` | Endpoints pour création automatique staff/patient |
| `PasswordChangeController.java` | Gestion du changement de mot de passe forcé |

### 2. Entités mises à jour

**User.java** :
```java
@Column(name = "must_change_password")
@Builder.Default
private Boolean mustChangePassword = true;

@Column(unique = true, nullable = true) // Email nullable
private String email;
```

**UserDTO.java** :
```java
private Boolean mustChangePassword;
private String generatedPassword; // Temporaire
```

### 3. Endpoints API

#### Création Staff (Admin)
```http
POST /api/account-creation/staff
Content-Type: application/json
Authorization: Bearer {token}

{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean@example.com", // optionnel
  "phoneNumber": "+243...",
  "role": "DOCTEUR",
  "departement": "Cardiologie"
}
```

**Réponse** :
```json
{
  "success": true,
  "username": "jean.dupont",
  "generatedPassword": "Inua@2026",
  "userId": 123,
  "mustChangePassword": true
}
```

#### Création Patient (Réception)
```http
POST /api/account-creation/patient/{patientId}
Authorization: Bearer {token}
```

#### Vérification statut changement mot de passe
```http
GET /api/password/must-change-status
Authorization: Bearer {token}
```

#### Changement mot de passe forcé
```http
POST /api/password/force-change
Authorization: Bearer {token}

{
  "newPassword": "NouveauMotDePasse123!",
  "confirmPassword": "NouveauMotDePasse123!"
}
```

---

## 💻 Frontend (React + Tailwind)

### 1. Fichiers créés

| Fichier | Description |
|---------|-------------|
| `SuccessAccountModal.jsx` | Modale affichant username et mot de passe |
| `ForcePasswordChange.jsx` | Formulaire changement mot de passe obligatoire |
| `PasswordChangeWrapper.jsx` | Wrapper vérifiant mustChangePassword |
| `accountCreationApi.js` | Service API pour création de comptes |

### 2. AuthContext mis à jour

Ajout dans le contexte :
```javascript
mustChangePassword: user?.mustChangePassword === true,
api: authAPI.api // Instance axios exposée
```

### 3. Intégration dans les formulaires

#### Pour Admin (Création d'utilisateur staff) :

```javascript
import accountCreationApi from '@/services/accountCreationApi';
import SuccessAccountModal from '@/components/auth/SuccessAccountModal';

// Dans votre composant
const [showSuccessModal, setShowSuccessModal] = useState(false);
const [generatedCredentials, setGeneratedCredentials] = useState(null);

const handleCreateUser = async (formData) => {
  try {
    const response = await accountCreationApi.createStaffAccount({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email, // optionnel
      phoneNumber: formData.phoneNumber,
      role: formData.role.replace('ROLE_', ''),
      departement: formData.department
    });
    
    if (response.success) {
      // Afficher la modale avec les credentials
      setGeneratedCredentials({
        username: response.username,
        generatedPassword: response.generatedPassword,
        user: response.user
      });
      setShowSuccessModal(true);
    }
  } catch (error) {
    toast.error(error.response?.data?.error || 'Erreur');
  }
};

// Dans le render
<SuccessAccountModal
  isOpen={showSuccessModal}
  onClose={() => setShowSuccessModal(false)}
  credentials={generatedCredentials}
  userType="staff"
/>
```

#### Pour Réception (Création de compte patient) :

```javascript
const createAccountForPatient = async (patientId) => {
  try {
    const response = await accountCreationApi.createPatientAccount(patientId);
    
    if (response.success) {
      setGeneratedCredentials({
        username: response.username,
        generatedPassword: response.generatedPassword,
        patient: response.patient
      });
      setShowSuccessModal(true);
    }
  } catch (error) {
    if (error.response?.data?.error?.includes('déjà un compte')) {
      toast.warning('Ce patient a déjà un compte');
    } else {
      toast.error('Erreur création compte');
    }
  }
};
```

### 4. Blocage du dashboard (changement mot de passe obligatoire)

Dans `App.jsx` ou votre route protégée principale :

```javascript
import PasswordChangeWrapper from '@/components/auth/PasswordChangeWrapper';

// Envelopper vos routes protégées
<ProtectedRoute>
  <PasswordChangeWrapper>
    <DashboardLayout>
      <Routes>
        {/* vos routes */}
      </Routes>
    </DashboardLayout>
  </PasswordChangeWrapper>
</ProtectedRoute>
```

---

## 🔄 Flux de fonctionnement

### 1. Création d'un utilisateur staff

```
Admin remplit le formulaire (prénom, nom, email optionnel)
    ↓
POST /api/account-creation/staff
    ↓
Backend génère : jean.dupont (ou jean.dupont1 si existe)
    ↓
Mot de passe hashé : Inua@2026
    ↓
mustChangePassword = true
    ↓
Réponse JSON avec credentials
    ↓
Frontend affiche SuccessAccountModal
    ↓
Admin imprime/note les identifiants
```

### 2. Premier login de l'utilisateur

```
Utilisateur se connecte avec jean.dupont / Inua@2026
    ↓
Backend vérifie mustChangePassword = true
    ↓
Retourne dans la réponse login : mustChangePassword: true
    ↓
PasswordChangeWrapper détecte le flag
    ↓
Affiche ForcePasswordChange (bloque dashboard)
    ↓
Utilisateur crée nouveau mot de passe
    ↓
POST /api/password/force-change
    ↓
Backend met à jour : mustChangePassword = false
    ↓
Redirection vers le dashboard
```

---

## 📝 Exemple complet : Users.jsx modifié

Voir le fichier : `src/pages/admin/UsersWithAutoAccount.jsx`

Ce fichier montre :
- Comment remplacer l'ancien endpoint par `accountCreationApi.createStaffAccount()`
- Comment afficher la modale avec les credentials
- Comment gérer les erreurs

---

## 🔐 Sécurité

1. **Mot de passe par défaut** : `Inua@2026` (modifiable dans `AccountGenerationUtils.java`)
2. **Hachage** : BCrypt avec `PasswordEncoder`
3. **Changement obligatoire** : Flag `mustChangePassword` forcé à true pour les nouveaux comptes
4. **Validation** : Le nouveau mot de passe doit être différent du défaut
5. **Complexité** : Minimum 6 caractères, 2 types parmi majuscules/minuscules/chiffres/spéciaux

---

## 🛠️ Personnalisation

### Modifier le mot de passe par défaut

Dans `AccountGenerationUtils.java` :
```java
public static final String DEFAULT_PASSWORD = "VotreMotDePasse";
```

### Modifier le format du username

Dans `AccountGenerationUtils.java`, méthode `generateUniqueUsername` :
```java
// Format actuel : prenom.nom
String baseUsername = normalizedFirst + "." + normalizedLast;

// Alternative : premierelettreprenom.nom
String baseUsername = normalizedFirst.charAt(0) + "." + normalizedLast;
```

### Ajouter des règles de complexité mot de passe

Dans `ForcePasswordChange.jsx`, fonction `validate` :
```javascript
// Ajouter des règles supplémentaires
if (!/[A-Z]/.test(newPassword)) {
  newErrors.newPassword = 'Au moins une majuscule requise';
}
if (!/[0-9]/.test(newPassword)) {
  newErrors.newPassword = 'Au moins un chiffre requis';
}
```

---

## ✅ Checklist de déploiement

- [ ] Backend compilé sans erreurs
- [ ] Migration base de données (champ `must_change_password` ajouté)
- [ ] Email passé en nullable dans la BDD
- [ ] Endpoints testés via Postman
- [ ] Frontend : composants importés correctement
- [ ] AuthContext mis à jour
- [ ] PasswordChangeWrapper ajouté aux routes protégées
- [ ] Test création utilisateur staff → modale affichée
- [ ] Test création patient → modale affichée
- [ ] Test premier login → formulaire changement mot de passe affiché
- [ ] Test changement mot de passe → redirection dashboard

---

## 🐛 Dépannage

### Le username n'est pas généré
- Vérifier que `AccountGenerationUtils` est bien injecté dans le controller
- Vérifier les logs backend pour les erreurs

### La modale ne s'affiche pas
- Vérifier que `generatedCredentials` est bien défini avant d'ouvrir la modale
- Vérifier que `isOpen` est bien à `true`

### Le changement de mot de passe ne fonctionne pas
- Vérifier que l'utilisateur est bien authentifié (token valide)
- Vérifier les logs backend pour les erreurs de validation

### mustChangePassword n'est pas détecté
- Vérifier que le champ est bien mappé dans `AuthContext.jsx`
- Vérifier que la réponse du login contient bien `mustChangePassword`

---

## 📞 Support

Pour toute question ou problème, consultez les logs :
- **Backend** : logs Spring Boot
- **Frontend** : console du navigateur

Les fichiers d'exemple sont disponibles :
- `UsersWithAutoAccount.jsx` : Exemple d'intégration côté admin
- `AccountCreationController.java` : Documentation des endpoints backend
