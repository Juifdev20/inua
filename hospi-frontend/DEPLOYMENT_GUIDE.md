# Guide de Déploiement InuaAfia

## Configuration Environnementale Automatique

L'application InuaAfia utilise maintenant un système de configuration automatique qui fonctionne sur localhost ET en production sans ajustement manuel.

### Fichiers de Configuration

#### `.env.development` (Localhost)
```
VITE_BACKEND_URL=http://localhost:8080
VITE_DEV_MODE=true
VITE_DEBUG_API=true
VITE_API_TIMEOUT=30000
```

#### `.env.production` (Render/Production)
```
VITE_BACKEND_URL=https://inuaafia.onrender.com
```

### Fonctionnement Automatique

Le système détecte automatiquement l'environnement :
- **Localhost** : Utilise `http://localhost:8080`
- **Production** : Utilise `https://inuaafia.onrender.com`

### Modules Configurés

#### 1. API Centrale (`src/api/axios.js`)
- URL backend automatique
- Timeout de 30 secondes
- Token d'authentification automatique
- Gestion des erreurs 401

#### 2. Configuration Environmentale (`src/config/environment.js`)
- Détection automatique de l'environnement
- URLs WebSocket
- URLs des ressources statiques
- Logs de debug (uniquement en dev)

#### 3. Helper Environmental (`src/utils/environmentHelper.js`)
- Validation des URLs
- Vérification de connectivité
- Logs détaillés pour debug

### Déploiement Simplifié

#### Pour le Développement (Localhost)
```bash
npm run dev
```
- Utilise automatiquement localhost:8080
- Logs détaillés dans la console
- Debug activé

#### Pour la Production (Render)
```bash
npm run build
npm run preview
```
- Utilise automatiquement l'URL de production
- Pas de logs de debug
- Optimisé pour la performance

### Modules Impactés

#### 1. Messagerie WebSocket
- URL WebSocket automatique selon l'environnement
- Reconnexion automatique
- Timeout configuré

#### 2. Uploads de Fichiers
- URL uploads automatique
- Support des images de profil
- Fallback pour ressources manquantes

#### 3. API REST
- Toutes les API utilisent la configuration centralisée
- Timeout uniforme
- Gestion d'erreurs améliorée

### Dépannage

#### Si un module ne fonctionne pas en production :

1. **Vérifie les logs de la console** (uniquement en dev)
2. **Utilise `validateUrls()`** pour vérifier la configuration
3. **Teste la connectivité** avec `checkConnectivity()`

#### Exemple de debug :
```javascript
import { validateUrls, checkConnectivity } from './utils/environmentHelper.js';

// Valider les URLs
const issues = validateUrls();
if (issues.length > 0) {
  console.error('Problèmes de configuration:', issues);
}

// Vérifier la connectivité
checkConnectivity().then(isConnected => {
  console.log('Connectivité backend:', isConnected);
});
```

### Bonnes Pratiques

1. **Ne jamais coder d'URL en dur** dans les composants
2. **Toujours utiliser** les fonctions utilitaires `getApiUrl()`, `getUploadUrl()`, etc.
3. **Tester sur localhost** avant de déployer
4. **Vérifier les logs** après déploiement

### Variables d'Environnement Disponibles

- `VITE_BACKEND_URL` : URL du backend
- `VITE_DEV_MODE` : Mode développement
- `VITE_DEBUG_API` : Debug API activé
- `VITE_API_TIMEOUT` : Timeout des requêtes API

### Avantages

- **Zéro configuration manuelle**
- **Déploiement automatique**
- **Debug facilité**
- **Maintenance simplifiée**
- **Pas d'erreurs d'URL**

---

*Ce système garantit que votre application fonctionne parfaitement sur localhost et en production sans aucun ajustement manuel.*
