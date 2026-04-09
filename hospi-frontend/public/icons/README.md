# Génération des Icônes Inua Afya

## Fichiers requis pour l'application

Pour que l'icône de l'application apparaisse correctement sur :
- **Android** (APK/TWA)
- **iOS** (PWA)
- **Favicon navigateur**
- **Raccourcis desktop**

## Tailles d'icônes nécessaires

Créez ces fichiers PNG avec le logo Inua Afya (cœur + ligne de pouls) :

```
public/icons/
├── favicon-16x16.png      (16x16px)
├── favicon-32x32.png      (32x32px)
├── favicon-48x48.png      (48x48px)
├── icon-72x72.png         (72x72px)  - Android
├── icon-96x96.png         (96x96px)  - Android
├── icon-128x128.png       (128x128px)
├── icon-144x144.png       (144x144px) - Android/iOS
├── icon-152x152.png       (152x152px) - iOS
├── icon-192x192.png       (192x192px) - Android/iOS (maskable)
├── icon-384x384.png       (384x384px)
├── icon-512x512.png       (512x512px) - Android/iOS
├── apple-touch-icon.png   (180x180px) - iOS
└── maskable-icon.png      (512x512px) - Android adaptive
```

## Design de l'icône

**Style recommandé :**
- Fond : Dégradé vert émeraude (#10b981 → #0d9488)
- Icône : Cœur blanc avec ligne de pouls
- Bord arrondi : 22% du rayon (comme sur la capture)
- Format : PNG transparent ou fond coloré

**Contenu :**
```
┌─────────────────┐
│    💚           │
│  ♥️╱╲╱╲         │
│                 │
└─────────────────┘
```

## Génération automatique

Utilisez l'un de ces outils :

1. **Figma** : Créer le design et exporter en PNG
2. **Adobe Illustrator** : Vectoriel puis export PNG
3. **Online generators** :
   - https://favicon.io/
   - https://realfavicongenerator.net/
   - https://appicon.co/

4. **CLI tools** :
   ```bash
   npm install -g pwa-asset-generator
   npx pwa-asset-generator logo.svg ./icons
   ```

## Script Node.js pour générer les icônes

```javascript
// scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '../src/assets/logo.svg');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const size of sizes) {
    await sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
    console.log(`✓ Generated icon-${size}x${size}.png`);
  }
}

generateIcons().catch(console.error);
```

## Installation

```bash
npm install --save-dev sharp
node scripts/generate-icons.js
```

## Mise à jour du manifest.json

Vérifiez que votre `public/manifest.json` contient :

```json
{
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

## Vérification

Après déploiement, vérifiez avec :
- Chrome DevTools → Application → Manifest
- Lighthouse PWA audit
- https://realfavicongenerator.net/favicon_checker
