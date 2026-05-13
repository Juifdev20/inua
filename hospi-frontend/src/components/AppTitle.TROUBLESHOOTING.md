# AppTitle - Troubleshooting Guide

## 🐛 Problèmes courants et solutions

### ❌ Problème 1: Les boutons n'apparaissent pas

**Symptômes**:
- La barre de titre est vide
- Aucun bouton visible

**Solutions**:
1. Vérifiez que `AppTitle` est importé dans `App.jsx`
   ```jsx
   import AppTitle from "./components/AppTitle";
   ```

2. Vérifiez que `AppTitle` est rendu dans le JSX
   ```jsx
   <BrowserRouter>
     <AppTitle /> {/* ← À présent? */}
     <Routes>...</Routes>
   </BrowserRouter>
   ```

3. Vérifiez que `showControls={true}` (valeur par défaut)
   ```jsx
   <AppTitle showControls={true} /> {/* Remplacez false par true */}
   ```

4. Vérifiez la configuration
   ```jsx
   import { appTitleConfig } from './config/appTitleConfig';
   console.log(appTitleConfig.enabled); // Doit être true
   console.log(appTitleConfig.showControls); // Doit être true
   ```

---

### ❌ Problème 2: Les icônes ne s'affichent pas

**Symptômes**:
- Les boutons sont présents mais pas d'icônes
- Carrés vides à la place des icônes

**Solutions**:
1. Vérifiez que `lucide-react` est installé
   ```bash
   npm list lucide-react
   # Doit montrer la version (ex: lucide-react@0.xxx)
   ```

2. Installez si manquant
   ```bash
   npm install lucide-react
   ```

3. Vérifiez les imports
   ```jsx
   import { ArrowLeft, RotateCcw } from 'lucide-react'; // Correct
   ```

4. Vérifiez le CSS (AppTitle.css doit être importé)
   ```jsx
   import './AppTitle.css'; // À présent dans AppTitle.jsx?
   ```

---

### ❌ Problème 3: Le bouton retour ne fonctionne pas

**Symptômes**:
- Clic sur le bouton ne fait rien
- Pas de navigation

**Solutions**:
1. Vérifiez que vous utilisez React Router v7+
   ```bash
   npm list react-router-dom
   ```

2. Vérifiez que l'app est entourée de `<BrowserRouter>`
   ```jsx
   <BrowserRouter>
     <AppTitle />
     <Routes>...</Routes>
   </BrowserRouter>
   ```

3. Vérifiez l'historique du navigateur
   ```jsx
   // Ouvrir la console et tester
   window.history.back(); // Doit fonctionner
   ```

4. Utilisez un callback personnalisé
   ```jsx
   <AppTitle 
     onBack={() => {
       console.log('Back clicked');
       window.location.href = '/dashboard';
     }}
   />
   ```

---

### ❌ Problème 4: Le bouton actualiser ne fonctionne pas

**Symptômes**:
- Clic sur le bouton ne rafraîchit rien
- Pas de reload

**Solutions**:
1. Vérifiez les droits de la page
   ```jsx
   // Si sur une page de formulaire, peut être bloqué par le navigateur
   ```

2. Utilisez un reload forcé
   ```jsx
   <AppTitle 
     onRefresh={() => {
       window.location.reload(true); // true = bypass cache
     }}
   />
   ```

3. Testez en console
   ```jsx
   window.location.reload(); // Doit fonctionner
   ```

---

### ❌ Problème 5: Les styles ne s'appliquent pas

**Symptômes**:
- Les boutons ne sont pas centrés
- Les couleurs sont incorrectes
- Pas d'animations

**Solutions**:
1. Vérifiez que `AppTitle.css` existe
   ```bash
   # Dans le terminal
   ls src/components/AppTitle.css # Doit exister
   ```

2. Vérifiez l'import du CSS
   ```jsx
   import './AppTitle.css'; // À présent dans AppTitle.jsx?
   ```

3. Videz le cache du navigateur
   ```
   Ctrl+Shift+Delete ou Cmd+Shift+Delete
   Sélectionnez "Cached images and files"
   Cliquez "Clear"
   ```

4. Reconstruisez le projet
   ```bash
   npm run build
   ```

---

### ❌ Problème 6: Les animations sont saccadées

**Symptômes**:
- Les rotations ne sont pas fluides
- Les transitions sautent

**Solutions**:
1. Vérifiez la performance GPU
   ```css
   /* Ajoutez à AppTitle.css */
   .title-btn {
     transform: translateZ(0); /* Force GPU acceleration */
   }
   ```

2. Réduisez la durée des animations
   ```jsx
   const config = mergeConfig({
     animations: {
       transitionDuration: '100ms', // Au lieu de 200ms
     }
   });
   ```

3. Désactivez les animations si problème persiste
   ```jsx
   const config = mergeConfig({
     animations: {
       rotateRefreshOnHover: false,
     }
   });
   ```

---

### ❌ Problème 7: Problème avec le mode sombre

**Symptômes**:
- Couleurs incorrectes en mode sombre
- Contraste faible

**Solutions**:
1. Vérifiez la préférence du système
   ```jsx
   // En console
   window.matchMedia('(prefers-color-scheme: dark)').matches
   ```

2. Forcez le mode sombre pour tester
   ```jsx
   // DevTools > Rendering > Emulate CSS media feature prefers-color-scheme
   ```

3. Personnalisez les couleurs sombres
   ```css
   @media (prefers-color-scheme: dark) {
     .title-btn {
       color: #YOUR_COLOR; /* Votre couleur */
     }
   }
   ```

---

### ❌ Problème 8: Conflits avec d'autres composants

**Symptômes**:
- AppTitle se chevauche avec d'autres éléments
- Z-index incorrect

**Solutions**:
1. Vérifiez le z-index
   ```jsx
   const config = mergeConfig({
     behavior: {
       zIndex: 1000, // Augmentez si nécessaire
     }
   });
   ```

2. Vérifiez le positionnement
   ```css
   .app-title-bar {
     position: sticky; /* ou fixed */
     top: 0;
   }
   ```

3. Vérifiez les marges des autres éléments
   ```css
   /* Si autre composant a une hauteur fixe */
   body {
     padding-top: 56px; /* Hauteur de AppTitle */
   }
   ```

---

### ❌ Problème 9: Configuration ne s'applique pas

**Symptômes**:
- Les changements de config n'ont aucun effet
- Les callbacks ne se déclenchent pas

**Solutions**:
1. Vérifiez la syntaxe de mergeConfig
   ```jsx
   // ❌ Mauvais
   const config = { ...appTitleConfig, enabled: false };
   
   // ✅ Correct
   const config = mergeConfig({ enabled: false });
   ```

2. Vérifiez que config est passé
   ```jsx
   <AppTitle config={config} />
   ```

3. Vérifiez les callbacks
   ```jsx
   const config = mergeConfig({
     callbacks: {
       beforeBack: () => console.log('Log this'), // Doit s'afficher
     }
   });
   ```

---

### ❌ Problème 10: Problème de performance

**Symptômes**:
- L'app ralentit quand AppTitle est présent
- Haut usage CPU

**Solutions**:
1. Vérifiez les re-renders
   ```jsx
   // Utiliser React DevTools Profiler
   ```

2. Désactivez les animations
   ```jsx
   const config = mergeConfig({
     animations: {
       rotateRefreshOnHover: false,
     }
   });
   ```

3. Limitez les callbacks
   ```jsx
   // ❌ Mauvais
   beforeBack: () => {
     complexOperation(); // Opération lourde
   }
   
   // ✅ Correct
   beforeBack: () => {
     console.log('Back clicked'); // Simple
   }
   ```

4. Utilisez la memoization
   ```jsx
   const memoizedConfig = useMemo(() => mergeConfig({...}), []);
   <AppTitle config={memoizedConfig} />
   ```

---

## 🔧 Debug Mode

Activez le mode debug pour voir les logs:

```jsx
const config = mergeConfig({
  debug: true,
});
<AppTitle config={config} />

// Dans la console du navigateur, vous verrez:
// [AppTitle] Back clicked
// [AppTitle] Refresh clicked
```

---

## 📞 Besoin d'aide?

1. Consultez `AppTitle.README.md`
2. Regardez les exemples dans `AppTitle.examples.jsx`
3. Vérifiez les tests dans `AppTitle.test.jsx`
4. Ouvrez une issue avec les logs de la console
5. Consultez le CHANGELOG pour les versions

---

**Dernière mise à jour**: Mai 2026
**Version**: 1.0.0

