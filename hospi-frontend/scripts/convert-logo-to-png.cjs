/**
 * ★ Script de conversion SVG → PNG pour le logo Inua Afya
 * Génère toutes les tailles d'icônes nécessaires pour PWA
 */

const fs = require('fs');
const path = require('path');

// Vérifier si sharp est installé
try {
  require.resolve('sharp');
} catch (e) {
  console.log('⚠️ Sharp n\'est pas installé.');
  console.log('📦 Installation en cours...');
  require('child_process').execSync('npm install sharp --save-dev', { stdio: 'inherit' });
}

const sharp = require('sharp');

const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '..', 'public', 'inuaafya-logo-dark.svg');
const outputDir = path.join(__dirname, '..', 'public', 'icons');

async function convertSvgToPng() {
  console.log('🎨 Conversion du logo Inua Afya (SVG → PNG)');
  console.log('==============================================\n');

  // Vérifier que le fichier SVG existe
  if (!fs.existsSync(inputSvg)) {
    console.error('❌ Fichier SVG non trouvé:', inputSvg);
    process.exit(1);
  }

  // Créer le dossier icons s'il n'existe pas
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svgBuffer = fs.readFileSync(inputSvg);

  for (const size of sizes) {
    const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputFile);
      
      console.log(`✅ ${size}x${size}px → ${path.basename(outputFile)}`);
    } catch (error) {
      console.error(`❌ Erreur ${size}x${size}:`, error.message);
    }
  }

  // Fichiers spéciaux
  const specialFiles = [
    { size: 32, name: 'favicon-32x32.png' },
    { size: 16, name: 'favicon-16x16.png' },
    { size: 48, name: 'favicon-48x48.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 512, name: 'maskable-icon.png' },
    { size: 1024, name: 'appstore.png' },
    { size: 512, name: 'playstore.png' }
  ];

  console.log('\n📱 Fichiers spéciaux...');
  
  for (const { size, name } of specialFiles) {
    const outputFile = path.join(outputDir, name);
    
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputFile);
      
      console.log(`✅ ${name} (${size}x${size}px)`);
    } catch (error) {
      console.error(`❌ Erreur ${name}:`, error.message);
    }
  }

  console.log('\n🎉 Conversion terminée !');
  console.log(`📁 Fichiers PNG générés dans: ${outputDir}`);
}

convertSvgToPng().catch(console.error);
