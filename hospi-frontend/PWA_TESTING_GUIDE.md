# 🧪 GUIDE DE TEST - Boutons de Navigation PWA Desktop

## 📋 Table des Matières
1. [Installation de l'app PWA](#installation)
2. [Tests Fonctionnels](#tests-fonctionnels)
3. [Tests Visuels](#tests-visuels)
4. [Troubleshooting](#troubleshooting)

---

## 🔧 Installation de l'App PWA {#installation}

### Pour Chrome/Edge/Brave (Windows/Mac/Linux)

**Étape 1: Ouvrir l'application en mode web**
```
1. Aller sur https://votre-domaine-production.com
2. Attendre que la page se charge complètement
3. Vous devriez voir une icône d'installation dans la barre d'adresse
```

**Étape 2: Installer la PWA**
```
Option A - Via la barre d'adresse:
  1. Cliquer sur l'icône d'installation (généralement une house/app icon)
  2. Cliquer "Installer"
  3. Confirmer dans la popup

Option B - Via le menu:
  1. Cliquer sur le menu ⋮ (trois points)
  2. Sélectionner "Installer InuaAfya"
  3. Confirmer

Option C - Via le menu contextuel:
  1. Clic droit anywhere sur la page
  2. "Installer application"
  3. Confirmer
```

**Étape 3: Vérifier l'installation**
```
✅ L'app doit s'ouvrir dans une fenêtre standalone (pas le navigateur)
✅ La barre de titre doit montrer "InuaAfya" sans l'adresse URL
✅ Voir les boutons Retour (←) et Actualiser (↻) à gauche du logo
```

### Pour Firefox (Expérimental)
```
1. about:config > browser.ssb.enabled = true
2. Aller sur l'application
3. Menu ⋮ > "Installer l'application"
```

### Pour Safari macOS (Limité)
```
1. Menu Fichier > Ajouter aux Dock
2. Ouvrir depuis le Dock
3. Support limité, peut ne pas afficher les boutons
```

---

## ✅ Tests Fonctionnels {#tests-fonctionnels}

### Test 1: Vérifier que les boutons sont visibles (PWA Desktop)

**Condition**: L'app doit être ouverte en mode installé

```
ÉTAPES:
  1. Installer et ouvrir l'app en mode PWA (voir section Installation)
  2. Regarder le header en haut de l'application
  3. À gauche du logo "InuaAfya"
  4. Vous devriez voir:
     ← (Retour)
     ↻ (Actualiser)

RÉSULTAT ATTENDU:
  ✅ Les deux boutons doivent être visibles
  ✅ Icônes grises avec un fond subtle
  ✅ Espacés régulièrement
  ✅ À gauche du menu hamburger mobile
```

**Si vous ne les voyez pas**:
- Vérifier que l'app est en mode standalone (pas dans le navigateur)
- Vérifier que le manifest.json contient `"display": "standalone"`
- Essayer F12 > Console: `window.matchMedia('(display-mode: standalone)').matches`
- Ce doit retourner `true`

---

### Test 2: Tester le Bouton Retour (← Back)

**Prérequis**: Les boutons doivent être visibles

```
ÉTAPES:
  1. Dans l'app PWA, cliquer sur "Réception" (ou autre module)
  2. Naviguer vers une page enfant (ex: patient détails)
  3. Localiser le bouton Retour (←) en haut à gauche
  4. Cliquer dessus

RÉSULTAT ATTENDU:
  ✅ Retour immédiat à la page précédente
  ✅ L'historique se met à jour
  ✅ Les données sont préservées (pas de reload)
  ✅ Pas de délai/latence

VARIATIONS À TESTER:
  - Retour depuis une page de détails patient → Liste patients
  - Retour depuis un formulaire → Page précédente
  - Retour depuis plusieurs clics en avant → Historique correct
  - Retour au début (quand pas d'historique) → Reste sur la même page
```

---

### Test 3: Tester le Bouton Actualiser (↻ Refresh)

**Prérequis**: Les boutons doivent être visibles

```
ÉTAPES:
  1. Être sur n'importe quelle page de l'app
  2. Localiser le bouton Actualiser (↻) à côté du Retour
  3. Cliquer dessus

RÉSULTAT ATTENDU:
  ✅ Page recharge complètement
  ✅ Les données se re-fetchent du serveur
  ✅ Le navigateur montre le loader momentanément
  ✅ Retour au début de la page après reload
  ✅ Url reste inchangée

VARIATIONS À TESTER:
  - Actualiser depuis la liste patients → Se met à jour
  - Actualiser depuis un formulaire → Données réinitialisées
  - Actualiser plusieurs fois → Pas de boucle infinie
  - Actualiser avec des données offline → Comportement gracieux
```

---

### Test 4: Vérifier les Effets Visuels

**Prérequis**: Les boutons doivent être visibles

```
ÉTAPES:
  1. Regarder les boutons Retour et Actualiser
  2. Passer la souris OVER chaque bouton
  
RÉSULTAT ATTENDU:
  ✅ Background légèrement plus sombre (hover effect)
  ✅ Icône peut agrandir légèrement (scale: 1.05)
  ✅ Transition douce (0.2s)
  ✅ Curseur change en "pointer"
  
TESTER LE CLICK:
  1. Cliquer et tenir sur un bouton
  2. L'icône doit se compresser légèrement (scale: 0.95)
  3. Au relâchement, revenir à la normale
```

---

### Test 5: Vérifier l'Absence sur Navigateur Web

**Prérequis**: Accès à la version web

```
ÉTAPES:
  1. Ouvrir l'application dans le navigateur web normal
     https://votre-domaine.com
  2. NE PAS installer la PWA
  3. Regarder le header

RÉSULTAT ATTENDU:
  ✅ Les boutons Retour et Actualiser NE DOIVENT PAS apparaître
  ✅ Le header doit être identique à avant
  ✅ Menu hamburger, langue, profil restent visibles
  ✅ L'app fonctionne normalement avec les outils du navigateur (← ↻)
```

---

## 🎨 Tests Visuels {#tests-visuels}

### Test 6: Vérifier l'Alignement & Positioning

**Prérequis**: PWA ouverte en mode standalone

```
ÉTAPES:
  1. Ouvrir l'app PWA en mode fullscreen
  2. Regarder le header (la barre du haut)
  3. Observer la position des boutons

ALIGNEMENT ATTENDU:
  
  ┌─────────────────────────────────────────────┐
  │ ←  ↻  ☰  [Recherche...]  [Langue]  ⚙️  🔔  👤 │
  │  ▲  ▲  ▲                                     │
  │  └──┴──┴── Boutons PWA à gauche             │
  └─────────────────────────────────────────────┘

VÉRIFICATIONS:
  ✅ Boutons tout à gauche du header
  ✅ Avant le menu hamburger (☰)
  ✅ Espacés régulièrement
  ✅ Alignés verticalement au centre
  ✅ Taille cohérente avec le reste (18px)
  ✅ Pas de décalage ou chevauchement
```

---

### Test 7: Vérifier la Compatibilité Thème Clair/Sombre

**Prérequis**: PWA ouverte, boutons visibles

```
ÉTAPES - MODE CLAIR:
  1. Cliquer sur l'icône Lune (☾) pour mode clair
  2. Observer les boutons

RÉSULTAT ATTENDU (Mode Clair):
  ✅ Icônes grises (text-muted-foreground)
  ✅ Background hover subtile
  ✅ Bien contrastées avec le fond blanc/gris

ÉTAPES - MODE SOMBRE:
  1. Cliquer sur l'icône Soleil (☀️) pour mode sombre
  2. Observer les boutons

RÉSULTAT ATTENDU (Mode Sombre):
  ✅ Icônes claires (couleur adaptée)
  ✅ Background hover subtile
  ✅ Bien visibles sur fond sombre
  ✅ Pas d'éblouissement
```

---

### Test 8: Vérifier le Responsive Design

**Prérequis**: PWA ouverte

```
ÉTAPES - PETIT ÉCRAN (< 480px):
  1. Redimensionner la fenêtre à < 480px
  2. Ou tester sur mobile Windows 11 (si disponible)
  
RÉSULTAT ATTENDU:
  ✅ Les boutons restent visibles
  ✅ L'espacement se réduit légèrement
  ✅ Pas de chevauchement
  ✅ Toujours cliquables
  ✅ Header ne "overflow" pas

ÉTAPES - GRAND ÉCRAN (> 1920px):
  1. Redimensionner la fenêtre à > 1920px
  
RÉSULTAT ATTENDU:
  ✅ Les boutons restent au même endroit
  ✅ Proportions maintenues
  ✅ Pas d'étirement anormal
```

---

## 🖱️ Tests Interactifs Avancés

### Test 9: Test de Drag de la Fenêtre

**Prérequis**: PWA ouverte en mode standalone, Windows/macOS

```
ÉTAPES 1 - DRAG SUR LE LOGO:
  1. Placer la souris sur le logo "InuaAfya"
  2. Cliquer + traîner vers la gauche
  
RÉSULTAT ATTENDU:
  ✅ La fenêtre se déplace
  ✅ Comportement standard du drag titlebar
  ✅ Pas de problème

ÉTAPES 2 - DRAG SUR LES BOUTONS:
  1. Placer la souris sur le bouton Retour
  2. Cliquer + traîner vers la droite
  
RÉSULTAT ATTENDU:
  ✅ Le bouton s'active (click)
  ✅ La fenêtre NE SE DÉPLACE PAS
  ✅ Pas de comportement de drag
  ✅ C'est la "propriété titlebar-no-drag" qui permet cela
```

---

### Test 10: Test de Rapidité/Performance

**Prérequis**: PWA ouverte

```
ÉTAPES:
  1. Cliquer rapidement sur le bouton Retour 5 fois
  2. Observer la réactivité
  
RÉSULTAT ATTENDU:
  ✅ Chaque clic provoque une action immédiate
  ✅ Pas de délai ou lag
  ✅ Pas de "bounce" ou bugs visuels
  ✅ L'historique reste cohérent

ÉTAPES:
  1. Cliquer sur Actualiser
  2. Cliquer immédiatement sur Retour (avant que la page ne finisse de charger)
  
RÉSULTAT ATTENDU:
  ✅ Comportement prévisible
  ✅ Pas de crash
  ✅ Pas d'erreur console
```

---

## 🌍 Tests Multi-Navigateur

### Test 11: Chrome/Chromium

```
NAVIGATEURS À TESTER:
  ✅ Google Chrome (Latest)
  ✅ Microsoft Edge (Latest)
  ✅ Brave Browser
  ✅ Opera Browser

POUR CHAQUE NAVIGATEUR:
  1. Installer l'app PWA
  2. Vérifier que les boutons apparaissent
  3. Tester le clic Retour
  4. Tester le clic Actualiser
  5. Tester le drag de fenêtre

RÉSULTAT ATTENDU:
  ✅ Tous les tests passent identiquement
  ✅ Comportement uniforme
```

---

### Test 12: Firefox (Expérimental)

```
PRÉREQUIS:
  - about:config > browser.ssb.enabled = true
  - Firefox 113+

RÉSULTAT ATTENDU:
  ⚠️ Les boutons peuvent ne pas apparaître (support limité)
  ⚠️ Support expérimental, pas garanti
  ℹ️ Prioriser Chrome/Edge pour PWA production
```

---

## 🆘 Troubleshooting {#troubleshooting}

### Problème: Les boutons ne s'affichent pas

**Diagnostic**:
```javascript
// Dans la console (F12)
window.matchMedia('(display-mode: standalone)').matches
// Doit retourner: true
```

**Solutions**:
1. ✅ Vérifier que l'app est installée (pas juste une tab du navigateur)
2. ✅ Vérifier que manifest.json contient `"display": "standalone"`
3. ✅ Vérifier que le CSS est chargé: 
   ```javascript
   document.querySelector('.titlebar-no-drag') !== null
   // Doit retourner: true
   ```
4. ✅ Hard refresh: `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
5. ✅ Relancer l'app PWA
6. ✅ Sur Chrome: Désinstaller et réinstaller l'app

---

### Problème: Les clics ne fonctionnent pas

**Diagnostic**:
```javascript
// Dans la console (F12)
const btn = document.querySelector('.titlebar-no-drag button');
window.getComputedStyle(btn).getPropertyValue('app-region')
// Doit retourner: "no-drag"
```

**Solutions**:
1. ✅ Vérifier que le CSS est chargé (voir ci-dessus)
2. ✅ Inspecter l'élément (F12 > Elements) et chercher `.titlebar-no-drag`
3. ✅ Vérifier que le CSS n'est pas overridé par du CSS global
4. ✅ Vérifier la console pour les erreurs (F12 > Console)
5. ✅ Essayer un autre navigateur Chromium

---

### Problème: Les clics provoquent du drag de fenêtre

**Diagnostic**:
```
Symptôme: Quand je clique sur les boutons, la fenêtre se déplace

Cause: La propriété CSS "app-region: no-drag" n'est pas appliquée
```

**Solutions**:
1. ✅ Vérifier que le fichier CSS est bien importé dans Header.jsx
2. ✅ Vérifier que la classe est bien appliquée aux boutons
3. ✅ Vérifier qu'il n'y a pas de CSS conflictant
4. ✅ Vérifier dans DevTools que `app-region: no-drag` est présent en CSS computed

---

### Problème: Les boutons apparaissent sur le navigateur web

**Diagnostic**:
```
Symptôme: Je vois les boutons même en naviguant avec Chrome normal
```

**Solution**:
```javascript
// Dans la console
window.matchMedia('(display-mode: standalone)').matches
// Doit retourner: false (sur navigateur web)
// Doit retourner: true (sur PWA installée)
```

**Vérification**:
1. Vérifier que vous êtes bien sur le navigateur, pas l'app PWA
2. Vérifier que le code a bien `{isPWA && ...}` (condition)
3. Vérifier que isPWA est bien `false` sur navigateur web

---

### Problème: Comportement différent entre les navigateurs

**Causes possibles**:
1. Versions différentes de Chromium
2. Extensions qui interfèrent
3. Cache navigateur obsolète

**Solutions**:
```bash
# Hard reload
Chrome/Edge: Ctrl+Shift+R
Mac: Cmd+Shift+R

# Ou en mode incognito/privé (pas d'extensions)
Ctrl+Shift+N (Windows)
Cmd+Shift+N (Mac)

# Désactiver les extensions temporairement
Chrome menu > Extensions > Désactiver tout
```

---

## 📊 Checklist Complète de Test

```
AVANT LE DÉPLOIEMENT:

☐ Installation PWA fonctionne
☐ Boutons visibles en mode PWA
☐ Boutons invisibles sur navigateur web
☐ Bouton Retour fonctionne
☐ Bouton Actualiser fonctionne
☐ Hover effects visibles
☐ Click effects visibles
☐ Drag de fenêtre fonctionne
☐ Mode clair compatible
☐ Mode sombre compatible
☐ Responsive design OK (<480px)
☐ Responsive design OK (>1920px)
☐ Chrome compatible
☐ Edge compatible
☐ Pas d'erreurs console
☐ Performance OK
☐ Aucun lag ou delay
```

---

## 🎓 Conseils de Debugging Avancé

### Activez les DevTools avancés
```
F12 > Menu (⋮) > More tools > Rendering
Cocher "Paint flashing" pour voir les redraws
Cocher "Rendering stats" pour voir FPS
```

### Vérifiez les performances
```
F12 > Performance > Record
Cliquer sur les boutons pendant l'enregistrement
Analyser les timings
```

### Inspectez le CSS appliqué
```
F12 > Elements
Clic droit sur le bouton
"Inspect element"
Regarder dans "Computed" pour voir tous les styles appliqués
Chercher "app-region: no-drag"
```

---

## 📞 Support

Si vous rencontrez des problèmes:

1. Vérifier la console pour les erreurs: `F12 > Console`
2. Vérifier que manifest.json est valide
3. Vérifier les logs serveur
4. Consulter le fichier `IMPLEMENTATION_PWA_NAVIGATION_COMPLETE.md`
5. Vérifier les compatibilité navigateur

---

**Version**: 1.0
**Dernière mise à jour**: 13 Mai 2026
**Status**: ✅ READY FOR TESTING

