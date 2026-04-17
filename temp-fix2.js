const fs = require('fs');

const filePath = 'C:\\Users\\dieud\\Desktop\\Inua\\hospi-frontend\\src\\components\\finance\\FinanceSidebar.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add TrendingUp to imports - using the exact text from file
content = content.replace(
  '  SlidersHorizontal\r\n} from \'lucide-react\';',
  '  SlidersHorizontal,\r\n  TrendingUp\r\n} from \'lucide-react\';'
);

// If that didn't work, try with just \n
if (!content.includes('TrendingUp')) {
  content = content.replace(
    '  SlidersHorizontal\n} from \'lucide-react\';',
    '  SlidersHorizontal,\n  TrendingUp\n} from \'lucide-react\';'
  );
}

// Add menu item - match the exact line in the file
const oldLine = "{ name: 'Gestion des DÃ\u00a9penses', path: '/finance/depenses',          icon: DollarSign,      color: 'text-warning' },";
const newLine = "{ name: 'Gestion des DÃ\u00a9penses', path: '/finance/depenses',          icon: DollarSign,      color: 'text-warning' },\r\n    { name: 'Gestion des EntrÃ\u00a9es', path: '/finance/entrees',           icon: TrendingUp,      color: 'text-emerald-500' },";

if (content.includes(oldLine)) {
  content = content.replace(oldLine, newLine);
  console.log('✅ Menu ajouté (avec encodage spécial)');
} else {
  // Try alternative encoding
  const altOldLine = "{ name: 'Gestion des Dépenses', path: '/finance/depenses',          icon: DollarSign,      color: 'text-warning' },";
  const altNewLine = "{ name: 'Gestion des Dépenses', path: '/finance/depenses',          icon: DollarSign,      color: 'text-warning' },\n    { name: 'Gestion des Entrées', path: '/finance/entrees',           icon: TrendingUp,      color: 'text-emerald-500' },";
  
  if (content.includes(altOldLine)) {
    content = content.replace(altOldLine, altNewLine);
    console.log('✅ Menu ajouté (UTF-8)');
  } else {
    console.log('⚠️ Ligne non trouvée, ajout manuel nécessaire');
  }
}

fs.writeFileSync(filePath, content);
console.log('Script terminé');
