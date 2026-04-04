"# Module Finance - Système de Gestion Hospitalière

## 📋 Vue d'ensemble

Module Finance complet pour un système de gestion hospitalière (HMS) moderne, développé avec React.js et TailwindCSS.

## 🎨 Caractéristiques

### ✨ Fonctionnalités principales

1. **Dashboard Finance**
   - Statistiques en temps réel (revenus, factures, dépenses)
   - Graphiques interactifs (évolution des revenus, répartition par service)
   - Actions rapides

2. **Caisse Admissions**
   - Gestion des paiements de consultations
   - Workflow : WAITING_PAYMENT → READY_FOR_DOCTOR
   - Liste des patients en attente

3. **Caisse Laboratoire**
   - Gestion des paiements d'examens médicaux
   - Système de verrouillage : examens visibles uniquement si PAID
   - Indicateurs de statut (🔒 Bloqué / 🔓 Libéré)

4. **Caisse Pharmacie**
   - Gestion des paiements de médicaments
   - Indicateurs visuels : 🔴 Non payé / 🟢 Payé
   - Autorisation de retrait après paiement

5. **Gestion des Factures**
   - Tableau complet avec recherche et filtres
   - Filtres par statut (PAID, UNPAID, PARTIAL) et type (ADMISSION, LABO, PHARMACIE)
   - Actions : Voir détail, Encaisser, Imprimer

6. **Services & Prix**
   - Interface CRUD pour la grille tarifaire
   - Gestion par catégorie (Admission, Laboratoire, Pharmacie)
   - Modification des prix en temps réel

### 🌓 Design System

- **Support Dark/Light Mode** : Thème sombre par défaut avec switch
- **Couleurs personnalisées** :
  - Vert émeraude néon (`#00FF9A`) - Couleur primaire
  - Orange (`#FFA500`) - Laboratoire
  - Cyan (`#00CED1`) - Pharmacie
  - Violet (`#8A2BE2`) - Complémentaire
- **Coins très arrondis** : `rounded-[32px]` pour les cartes
- **Typographie** : Titres en gras, uppercase, italic
- **Icônes** : Lucide React

### 🌍 Internationalisation (i18n)

- **Français** (par défaut)
- **Anglais**
- Switch rapide dans le header

### 📱 Responsive Design

- Desktop optimisé
- Tablette
- Mobile (sidebar collapsible)

## 🛠️ Stack Technologique

- **React.js 19**
- **React Router DOM** - Navigation
- **TailwindCSS** - Styling
- **Radix UI** - Composants UI
- **Lucide Icons** - Icônes
- **Recharts** - Graphiques
- **Axios** - API calls
- **Sonner** - Notifications toast
- **react-i18next** - Internationalisation

## 📁 Structure du Projet

```
/app/frontend/src/
├── features/
│   └── finance/
│       ├── components/
│       │   ├── FinanceSidebar.jsx
│       │   ├── FinanceHeader.jsx
│       │   └── PaymentModal.jsx
│       ├── pages/
│       │   ├── FinanceLayout.jsx
│       │   ├── FinanceDashboard.jsx
│       │   ├── CaisseAdmissions.jsx
│       │   ├── CaisseLaboratoire.jsx
│       │   ├── CaissePharmacie.jsx
│       │   ├── InvoicesManagement.jsx
│       │   └── ServiceManager.jsx
│       ├── services/
│       │   └── financeApi.js
│       ├── hooks/
│       │   └── useTheme.js
│       └── utils/
├── i18n/
│   ├── config.js
│   └── locales/
│       ├── fr.json
│       └── en.json
└── components/ui/ (Radix UI components)
```

## 🔌 API Backend (Spring Boot)

### Endpoints attendus

```
GET    /api/finance/dashboard           - Stats globales
GET    /api/finance/invoices            - Liste factures
GET    /api/finance/invoices/:id        - Détail facture
POST   /api/finance/invoices            - Créer facture
PUT    /api/finance/invoices/:id/pay    - Encaisser paiement
GET    /api/finance/admissions          - Queue admissions
GET    /api/finance/laboratory          - Queue laboratoire
GET    /api/finance/pharmacy            - Queue pharmacie
GET    /api/finance/services            - Liste services
PUT    /api/finance/services/:id        - Modifier service
POST   /api/finance/services            - Créer service
DELETE /api/finance/services/:id        - Supprimer service
```

### Configuration

Le fichier `financeApi.js` contient :
- **Mock data** pour démonstration
- **Structure API prête** pour connexion Spring Boot
- Décommenter les appels API réels et commenter les mocks

## 🚀 Démarrage

```bash
# Installation des dépendances
cd /app/frontend
yarn install

# Démarrage du serveur de développement
yarn start

# Build de production
yarn build
```

## 🔐 Authentification

Le module Finance nécessite :
- Rôle : **FINANCE** ou **ADMIN**
- Token JWT dans `localStorage.authToken`

## 🎯 Workflow Financier

### Principe du \"Verrou Financier\"

Le module Finance agit comme un **verrou** dans le parcours patient :

1. **Admission** : Patient bloqué à la caisse jusqu'au paiement
   - Status: `WAITING_PAYMENT` → `READY_FOR_DOCTOR`

2. **Laboratoire** : Examens invisibles pour le laborantin si non payé
   - Status: `UNPAID` (🔒 Bloqué) → `PAID` (🔓 Libéré)

3. **Pharmacie** : Médicaments préparés mais indicateur de paiement
   - Indicateur: 🔴 Non payé → 🟢 Payé (autorisation retrait)

## 📊 Données Mock

Le système inclut des données de démonstration réalistes :
- 5 factures d'exemple (Admissions, Labo, Pharmacie)
- 10 services médicaux
- Stats dashboard avec graphiques

## 🎨 Thème personnalisé

Couleurs définies dans `/app/frontend/src/index.css` :

```css
--emerald-neon: 160 100% 50%;
--hospital-orange: 39 100% 50%;
--hospital-blue: 181 100% 41%;
--hospital-purple: 271 76% 53%;
```

## 🧪 Testing

Tous les composants incluent des `data-testid` pour faciliter les tests :
- `finance-dashboard`
- `caisse-admissions`, `caisse-laboratoire`, `caisse-pharmacie`
- `admission-card-{id}`, `lab-card-{id}`, `pharmacy-card-{id}`
- `btn-encaisser`, `btn-valider-paiement`
- `invoices-management`, `service-manager`

## 📝 TODO / Améliorations futures

- [ ] Impression de tickets thermiques 80mm
- [ ] Rapport PDF des revenus
- [ ] Export Excel des factures
- [ ] Statistiques avancées (graphiques personnalisables)
- [ ] Notifications temps réel (WebSocket)
- [ ] Historique des paiements
- [ ] Multi-devises
- [ ] Gestion des remboursements

## 👥 Contributeurs

Développé par E1 - Emergent AI Agent

## 📄 Licence

© 2025 INUA AFIA - Tous droits réservés
"