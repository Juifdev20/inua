#!/usr/bin/env node

/**
 * Script de génération des icônes Inua Afya
 * 
 * Usage: node generate-icons.js
 * 
 * Ce script génère toutes les tailles d'icônes nécessaires pour :
 * - PWA (Progressive Web App)
 * - Android (TWA/APK)
 * - iOS
 * - Favicons
 */

const fs = require('fs');
const path = require('path');

// Vérifier si sharp est installé
try {
  var sharp = require('sharp');
} catch (e) {
  console.log('⚠️  Sharp n\'est pas installé.');
  console.log('   Installation: npm install --save-dev sharp');
  console.log('   Puis relancez: node scripts/generate-icons.js');
  process.exit(1);
}

// Configuration
const CONFIG = {
  inputSvg: path.join(__dirname, '../src/assets/LogoInuaAfya.svg'),
  outputDir: path.join(__dirname, '../public/icons'),
  sizes: [
    { size: 16, name: 'favicon-16x16' },
    { size: 32, name: 'favicon-32x32' },
    { size: 48, name: 'favicon-48x48' },
    { size: 72, name: 'icon-72x72' },
    { size: 96, name: 'icon-96x96' },
    { size: 128, name: 'icon-128x128' },
    { size: 144, name: 'icon-144x144' },
    { size: 152, name: 'icon-152x152' },
    { size: 180, name: 'apple-touch-icon' },
    { size: 192, name: 'icon-192x192', maskable: true },
    { size: 384, name: 'icon-384x384' },
    { size: 512, name: 'icon-512x512', maskable: true },
    { size: 512, name: 'maskable-icon', maskable: true, padding: 0.1 }
  ]
};

// Couleurs pour le padding des icônes maskable
const BACKGROUND_COLOR = '#10b981';

async function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Création du dossier: ${dir}`);
  }
}

async function generateIcon({ size, name, maskable = false, padding = 0 }) {
  const outputPath = path.join(CONFIG.outputDir, `${name}.png`);
  
  try {
    let pipeline = sharp(CONFIG.inputSvg, {
      density: 300 // Haute résolution pour le rendu SVG
    });

    if (maskable && padding > 0) {
      // Pour les icônes maskable avec padding
      const paddingSize = Math.round(size * padding);
      const iconSize = size - (paddingSize * 2);
      
      pipeline = pipeline
        .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .extend({
          top: paddingSize,
          bottom: paddingSize,
          left: paddingSize,
          right: paddingSize,
          background: { r: 16, g: 185, b: 129, alpha: 1 } // #10b981
        });
    } else {
      // Redimensionnement standard
      pipeline = pipeline.resize(size, size, { fit: 'cover' });
    }

    await pipeline
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(outputPath);

    const maskableTag = maskable ? ' (maskable)' : '';
    console.log(`✅ Généré: ${name}.png (${size}x${size})${maskableTag}`);
    
  } catch (error) {
    console.error(`❌ Erreur lors de la génération de ${name}.png:`, error.message);
  }
}

async function generateFaviconIco() {
  // Générer favicon.ico (multi-resolution pour IE/ancien navigateurs)
  const sizes = [16, 32, 48];
  const buffers = [];
  
  for (const size of sizes) {
    const buffer = await sharp(CONFIG.inputSvg)
      .resize(size, size)
      .png()
      .toBuffer();
    buffers.push(buffer);
  }
  
  console.log('ℹ️  favicon.ico: Utilisez favicon-16x16.png, favicon-32x32.png, favicon-48x48.png');
  console.log('   ou convertissez avec: https://favicon.io/favicon-converter/');
}

async function updateManifest() {
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    console.log('⚠️  manifest.json non trouvé, création...');
    
    const manifest = {
      name: "Inua Afya - Système de Gestion Hospitalier",
      short_name: "Inua Afya",
      description: "Système de gestion hospitalière complet",
      start_url: "/",
      display: "standalone",
      background_color: "#0f172a",
      theme_color: "#10b981",
      orientation: "portrait-primary",
      scope: "/",
      icons: CONFIG.sizes.map(({ size, name, maskable }) => ({
        src: `/icons/${name}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        ...(maskable && { purpose: "any maskable" })
      }))
    };
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ manifest.json créé');
  } else {
    console.log('ℹ️  manifest.json existe déjà, veuillez y ajouter les icônes manuellement');
  }
}

async function main() {
  console.log('🚀 Génération des icônes Inua Afya...\n');
  
  // Vérifier que le SVG source existe
  if (!fs.existsSync(CONFIG.inputSvg)) {
    console.error(`❌ Fichier source non trouvé: ${CONFIG.inputSvg}`);
    console.log('   Créez d\'abord le fichier SVG du logo dans src/assets/LogoInuaAfya.svg');
    process.exit(1);
  }
  
  // Créer le dossier de sortie
  await ensureDirectoryExists(CONFIG.outputDir);
  
  // Générer toutes les icônes
  console.log('📦 Génération des icônes...');
  for (const config of CONFIG.sizes) {
    await generateIcon(config);
  }
  
  // Info sur favicon.ico
  console.log('\n📝 Note sur favicon.ico:');
  await generateFaviconIco();
  
  // Mettre à jour le manifest
  console.log('\n📝 Mise à jour du manifest...');
  await updateManifest();
  
  console.log('\n✨ Terminé!');
  console.log(`📂 Les icônes sont dans: ${CONFIG.outputDir}`);
  console.log('\nProchaines étapes:');
  console.log('1. Redémarrez votre application React');
  console.log('2. Déployez sur Render');
  console.log('3. Les icônes seront utilisées automatiquement');
}

main().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
