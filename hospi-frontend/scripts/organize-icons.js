#!/usr/bin/env node

/**
 * Script pour organiser les icônes générées par appicon.co
 * 
 * Usage: node organize-icons.js
 */

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../public/icons');
const androidDir = path.join(iconsDir, 'android');

// Mapping des fichiers Android vers les noms standards
const fileMapping = {
  // Favicons
  'mipmap-mdpi/ic_launcher_foreground.png': 'favicon-48x48.png',
  
  // Android icons
  'mipmap-hdpi/ic_launcher.png': 'icon-72x72.png',
  'mipmap-xhdpi/ic_launcher.png': 'icon-96x96.png',
  'mipmap-xxhdpi/ic_launcher.png': 'icon-144x144.png',
  'mipmap-xxxhdpi/ic_launcher.png': 'icon-192x192.png',
  
  // App Store / Play Store
  '../appstore.png': 'icon-512x512.png',
  '../playstore.png': 'icon-512x512-playstore.png',
};

// iOS icon sizes from Assets.xcassets
const iosMapping = {
  'AppIcon.appiconset/16.png': 'favicon-16x16.png',
  'AppIcon.appiconset/32.png': 'favicon-32x32.png',
  'AppIcon.appiconset/152.png': 'icon-152x152.png',
  'AppIcon.appiconset/180.png': 'apple-touch-icon.png',
  'AppIcon.appiconset/192.png': 'icon-192x192-ios.png',
  'AppIcon.appiconset/512.png': 'icon-512x512-ios.png',
};

function copyFile(source, destination) {
  try {
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, destination);
      console.log(`✅ Copié: ${path.basename(source)} → ${path.basename(destination)}`);
      return true;
    } else {
      console.log(`❌ Fichier manquant: ${source}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return false;
  }
}

function organizeIcons() {
  console.log('🚀 Organisation des icônes...\n');
  
  let copiedCount = 0;
  
  // Copier les fichiers Android
  console.log('📱 Android Icons:');
  for (const [source, dest] of Object.entries(fileMapping)) {
    const sourcePath = path.join(androidDir, source);
    const destPath = path.join(iconsDir, dest);
    if (copyFile(sourcePath, destPath)) copiedCount++;
  }
  
  // Copier les fichiers iOS
  console.log('\n🍎 iOS Icons:');
  const iosDir = path.join(iconsDir, 'Assets.xcassets');
  for (const [source, dest] of Object.entries(iosMapping)) {
    const sourcePath = path.join(iosDir, source);
    const destPath = path.join(iconsDir, dest);
    if (copyFile(sourcePath, destPath)) copiedCount++;
  }
  
  console.log(`\n✨ Terminé! ${copiedCount} fichiers organisés.`);
  console.log('\n📂 Les icônes sont maintenant dans: public/icons/');
  console.log('\nProchaine étape:');
  console.log('1. git add public/icons/');
  console.log('2. git commit -m "Add PWA icons"');
  console.log('3. git push origin main');
}

organizeIcons();
