# ============================================
# CONFIGURATION FULLSTACK INUAAFIA - GUIDE COMPLET
# ============================================

## 1. BACKEND - WebConfig.java (deja mis a jour)

Le fichier `WebConfig.java` supporte maintenant:
- **Localhost** : http://localhost:5173 (Vite) ou http://localhost:3000 (CRA)
- **Production** : https://inuaafia.onrender.com

**Variable d'environnement optionnelle:**
```properties
cors.allowed-origins=http://localhost:5173,http://localhost:3000,https://inuaafia.onrender.com
```

---

## 2. FRONTEND - Configuration Variables d'environnement

### 2.1 Fichier .env (a la racine du projet frontend)

**Pour Vite (recommande) - fichier : `.env`**
```env
# ============================================
# VARIABLES D'ENVIRONNEMENT FRONTEND (VITE)
# ============================================

# URL API Backend (Local)
VITE_API_URL=http://localhost:8080

# URL API Backend (Production) - decommenter pour build production
# VITE_API_URL=https://inuaafia.onrender.com
```

**Pour Create React App (CRA) - fichier : `.env`**
```env
# ============================================
# VARIABLES D'ENVIRONNEMENT FRONTEND (CRA)
# ============================================

# URL API Backend (Local)
REACT_APP_API_URL=http://localhost:8080

# URL API Backend (Production) - decommenter pour build production
# REACT_APP_API_URL=https://inuaafia.onrender.com
```

**Important:**
- Vite : les variables doivent commencer par `VITE_`
- CRA : les variables doivent commencer par `REACT_APP_`

---

## 3. FRONTEND - Service API (axiosConfig.js)

### 3.1 Pour Vite (axiosConfig.js)
```javascript
// ============================================
// CONFIGURATION AXIOS - VITE
// ============================================
import axios from 'axios';

// Recupere l'URL API depuis les variables d'environnement
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gerer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expire ou invalide
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 3.2 Pour Create React App (api.js)
```javascript
// ============================================
// CONFIGURATION AXIOS - CREATE REACT APP
// ============================================
import axios from 'axios';

// Recupere l'URL API depuis les variables d'environnement
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gerer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 4. EXEMPLE D'UTILISATION

### Dans tes composants React:
```javascript
import api from '../services/axiosConfig';

// Exemple: Login
const login = async (credentials) => {
  try {
    const response = await api.post('/api/auth/login', credentials);
    localStorage.setItem('token', response.data.token);
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Exemple: Recuperer des donnees
const getPatients = async () => {
  try {
    const response = await api.get('/api/patients');
    return response.data;
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
};
```

---

## 5. DEPLOIEMENT SUR RENDER (FRONTEND)

### 5.1 Configuration Render (Static Site)

**Settings:**
- **Build Command:** `npm run build`
- **Publish Directory:** `dist` (pour Vite) ou `build` (pour CRA)

### 5.2 Variables d'environnement sur Render

Dans le dashboard Render de ton **Static Site**:

```
VITE_API_URL=https://inuaafia.onrender.com
```

Ou pour CRA:
```
REACT_APP_API_URL=https://inuaafia.onrender.com
```

**Etapes:**
1. Va sur https://dashboard.render.com
2. Selectionne ton **Static Site**
3. Clique sur **"Environment"**
4. Ajoute la variable `VITE_API_URL=https://inuaafia.onrender.com`
5. Clique sur **"Save Changes"**
6. Redeploie manuellement ou attends le redeploiement auto

---

## 6. VERIFICATION

### Test local:
```bash
# Frontend
npm run dev

# Backend (doit tourner sur localhost:8080)
```

### Test production:
1. Accede a ton URL frontend sur Render
2. Ouvre la console navigateur (F12)
3. Verifie que les requetes API partent vers `https://inuaafia.onrender.com`
4. Verifie qu'il n'y a pas d'erreurs CORS

---

## 7. RESUME DES FICHIERS A CREER/MODIFIER

| Fichier | Emplacement | Action |
|---------|-------------|--------|
| `.env` | Racine frontend | Creer avec VITE_API_URL |
| `axiosConfig.js` | `src/services/` | Creer le service API |
| `WebConfig.java` | Backend deja mis a jour | Deja configure |
| Render Environment | Dashboard Render | Ajouter VITE_API_URL |

---

## 8. COMMANDES RENDER RESUMEES

| Framework | Build Command | Publish Directory |
|-----------|---------------|-------------------|
| **Vite** | `npm run build` | `dist` |
| **Create React App** | `npm run build` | `build` |

---

## 9. DEPANNAGE CORS

Si tu as encore des erreurs CORS:

### 1. Verifier que le backend est bien en ligne
```bash
curl https://inuaafia.onrender.com/actuator/health
```

### 2. Verifier les headers dans WebConfig.java
- `allowedHeaders("*")` doit autoriser tous les headers
- `allowCredentials(true)` pour les cookies/token

### 3. Verifier l'URL dans les logs Render
Les logs du frontend doivent montrer:
```
API URL: https://inuaafia.onrender.com
```

### 4. Redemarrer les services
- Redeployer le backend (pour appliquer WebConfig)
- Redeployer le frontend
