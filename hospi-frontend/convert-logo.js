const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'public', 'inuaafya-logo-dark.svg');
const output192 = path.join(__dirname, 'public', 'logo192.png');
const output512 = path.join(__dirname, 'public', 'logo512.png');

async function convertSvgToPng() {
  try {
    console.log('🎨 Conversion du logo SVG vers PNG...');
    
    // Lire le fichier SVG
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Convertir en 192x192
    await sharp(svgBuffer)
      .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(output192);
    console.log('✅ logo192.png créé');
    
    // Convertir en 512x512
    await sharp(svgBuffer)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(output512);
    console.log('✅ logo512.png créé');
    
    console.log('🎉 Conversion terminée !');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n💡 Installez sharp avec: npm install sharp');
  }
}

convertSvgToPng();
