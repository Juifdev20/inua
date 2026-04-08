# Compte Administrateur InuaAfia

## Identifiants par Défaut

### Compte Admin Principal
- **Nom d'utilisateur**: `admin`
- **Mot de passe**: `admin123`
- **Email**: `admin@inuaafia.com`
- **Rôle**: `ROLE_ADMIN`

### ✅ UTILISATION EN PRODUCTION

**OUI, ce même compte fonctionne en production !**

Les comptes par défaut sont créés **automatiquement** au démarrage du backend, que ce soit :
- ✅ **Localhost** - `http://localhost:8080`
- ✅ **Production** - `https://inuaafia.onrender.com`

### Comment ça marche ?

Le `DataInitializer` s'exécute au démarrage de l'application :
1. Vérifie si le compte `admin` existe
2. Si non, le crée avec les identifiants par défaut
3. Si oui, ne fait rien (évite les doublons)

### Accès en Production

1. **URL Production**: `https://inua-oux2.onrender.com`
2. **Identifiants**: `admin` / `admin123`
3. **Accès immédiat** à l'administration

### ⚠️ SÉCURITÉ PRODUCTION

**IMPORTANT** : Pour la production, change immédiatement le mot de passe :
1. Connecte-toi avec `admin` / `admin123`
2. Va dans ton profil
3. Change le mot de passe
4. Utilise un mot de passe fort

### Compte Docteur Test
- **Nom d'utilisateur**: `doctor`
- **Mot de passe**: `doctor123`
- **Email**: `doctor@inuaafia.com`
- **Rôle**: `ROLE_DOCTEUR`

## Rôles Disponibles

### 1. **ROLE_ADMIN** - Administrateur
- Accès complet au système
- Gestion des utilisateurs et rôles
- Configuration du système
- Accès à tous les modules

### 2. **ROLE_DOCTEUR** - Médecin
- Consultations patients
- Prescriptions médicales
- Accès aux dossiers médicaux
- Messagerie avec patients

### 3. **ROLE_RECEPTION** - Réception
- Gestion des admissions
- Prise de rendez-vous
- Enregistrement patients
- Accueil patients

### 4. **ROLE_FINANCE** - Finance
- Gestion des factures
- Rapports financiers
- Validation des paiements
- Export comptabilité

### 5. **ROLE_CAISSIER** - Caissier
- Encaissements
- Reçus et factures
- Gestion caisse
- Rapports journaliers

### 6. **ROLE_PHARMACIE** - Pharmacie
- Gestion des médicaments
- Dispensation
- Stock pharmacie
- Ordonnances

### 7. **ROLE_PHARMACIST** - Pharmacien
- Validation ordonnances
- Conseils médicamenteux
- Gestion stock
- Interactions médicamenteuses

### 8. **ROLE_LABORATOIRE** - Laboratoire
- Analyses médicales
- Résultats labo
- Échantillons
- Rapports analyses

### 9. **ROLE_INFIRMIER** - Infirmier
- Soins infirmiers
- Suivi patients
- Medications
- Constantes vitales

### 10. **ROLE_PATIENT** - Patient
- Prise de rendez-vous
- Messagerie médecins
- Historique médical
- Documents personnels

## Comment Gérer les Rôles

### 1. Connexion Admin
1. Connecte-toi avec `admin` / `admin123`
2. Va dans "Administration" > "Utilisateurs"
3. Clique sur "Ajouter un utilisateur"

### 2. Attribution des Rôles
1. Remplis les informations utilisateur
2. Sélectionne le rôle approprié dans la liste déroulante
3. Enregistre l'utilisateur

### 3. Modification des Rôles
1. Trouve l'utilisateur dans la liste
2. Clique sur "Modifier"
3. Change le rôle si nécessaire
4. Sauvegarde les modifications

## Sécurité

### Pour la Production
- Change immédiatement le mot de passe admin
- Utilise des mots de passe forts
- Limite le nombre de comptes admin
- Active l'authentification 2FA si disponible

### Bonnes Pratiques
- Un compte admin par département
- Rôles spécifiques selon les besoins
- Révocation des accès inutilisés
- Audit régulier des permissions

## Dépannage

### Si tu ne peux pas te connecter
1. Vérifie que le backend est démarré
2. Redémarre le backend pour créer les comptes par défaut
3. Vérifie les logs du backend

### Si les rôles ne s'affichent pas
1. Vérifie la connexion à la base de données
2. Redémarre l'application
3. Contacte l'administrateur système

---

*Les comptes par défaut sont créés automatiquement au démarrage du backend.*
