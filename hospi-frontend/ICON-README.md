# 📱 Guide Icônes InuaAfya pour Android WebAPK

## 🎯 Problème : Icône trop petite avec bordures blanches

**Cause** : Les icônes actuelles ont du padding blanc autour du logo.
**Solution** : Créer des icônes "maskable" qui remplissent 100% de l'espace.

---

## 📐 Zone de Sécurité Maskable

Pour les icônes **maskable** Android, le logo doit :
- **Remplir tout l'espace 192x192 ou 512x512**
- **Aucun padding blanc**
- **Le logo doit aller jusqu'aux bords**

```
┌──────────────────────┐
│  ░░░░░░░░░░░░░░░░░░  │  ← Aucune bordure blanche
│  ░░░┌──────────┐░░░  │
│  ░░░│  LOGO    │░░░  │  ← Logo touche les bords
│  ░░░│  INUA    │░░░  │
│  ░░░│   AFYA   │░░░  │
│  ░░░└──────────┘░░░  │
│  ░░░░░░░░░░░░░░░░░░  │
└──────────────────────┘
   ↑ Toute la surface
     doit être remplie
```

---

## 🛠️ Outil Recommandé : Maskable.app

**URL** : https://maskable.app/editor

### Étapes :

1. **Allez sur** https://maskable.app/editor
2. **Uploadez** votre logo SVG vert (`inuaafya-logo-dark.svg`)
3. **Configurez** :
   - Layer 1: Background → Couleur verte `#10b981` (ou transparent si déjà dans SVG)
   - Layer 2: Logo → Votre SVG centré
   - Padding: **0%** (important !)
   - Scale: **100%** (logo touche les bords)
4. **Téléchargez** :
   - `icon-192x192-maskable.png` (192x192)
   - `icon-512x512-maskable.png` (512x512)

---

## 📁 Fichiers à Placer dans `public/icons/`

```
public/icons/
├── favicon-16x16.png
├── favicon-32x32.png
├── favicon-48x48.png
├── icon-72x72.png
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-192x192.png          ← Normal (avec fond)
├── icon-192x192-maskable.png ← MASKABLE (plein)
├── icon-384x384.png
├── icon-512x512.png          ← Normal (avec fond)
├── icon-512x512-maskable.png ← MASKABLE (plein)
└── apple-touch-icon.png
```

---

## 🎨 Configuration des Icônes

### Pour les icônes **normales** (`purpose: "any"`) :
- Fond blanc ou transparent
- Logo centré avec padding
- Pour iOS et vieux Android

### Pour les icônes **maskables** (`purpose: "maskable"`) :
- **Fond vert plein** (`#10b981`)
- **Logo sans padding**
- **Remplit tout l'espace**
- Pour Android 8+ (WebAPK)

---

## 🧪 Vérifier avec Chrome DevTools

1. Ouvrez Chrome → F12 → **Application**
2. Cliquez sur **Manifest**
3. Vérifiez que les icônes maskables sont listées
4. Testez avec l'outil **"Add to home screen"**

---

## 📱 Résultat Attendu

| Avant (mauvais) | Après (correct) |
|-----------------|-----------------|
| Petit logo au centre | Logo plein écran |
| Bordures blanches | Pas de bordures |
| Badge Chrome visible | **Badge Chrome disparaît** |
| Nom tronqué | Nom complet visible |

---

## ⚡ Commande Rapide

Si vous avez les fichiers PNG originaux sans fond :

```bash
# Avec ImageMagick (si installé)
convert icon-192x192.png -background '#10b981' -gravity center -extent 192x192 icon-192x192-filled.png
```

**Ou utilisez** : https://www.photopea.com/ (gratuit, en ligne)

1. Ouvrez le PNG
2. Image → Canvas Size → 192x192
3. Remplissez le fond de vert
4. Exportez en PNG

---

## ✅ Checklist Finale

- [ ] `icon-192x192-maskable.png` créé (plein format)
- [ ] `icon-512x512-maskable.png` créé (plein format)
- [ ] Les fichiers sont dans `public/icons/`
- [ ] Fichiers commités dans git
- [ ] Application redémarrée
- [ ] Test sur Android

---

## 🔗 Ressources

- **Maskable.app** : https://maskable.app/editor
- **WebAPK Guide** : https://web.dev/install-criteria/
- **Icon Generator** : https://www.pwabuilder.com/imageGenerator
