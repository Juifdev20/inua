const fs = require('fs');

const filePath = 'C:\\Users\\dieud\\Desktop\\Inua\\hospi-frontend\\src\\components\\finance\\FinanceSidebar.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add TrendingUp to imports
content = content.replace(
  '  SlidersHorizontal\n} from \'lucide-react\';',
  '  SlidersHorizontal,\n  TrendingUp\n} from \'lucide-react\';'
);

// Add menu item after Gestion des Depenses
const oldMenu = "{ name: 'Gestion des Dépenses', path: '/finance/depenses',          icon: DollarSign,      color: 'text-warning' },";
const newMenu = "{ name: 'Gestion des Dépenses', path: '/finance/depenses',          icon: DollarSign,      color: 'text-warning' },\n    { name: 'Gestion des Entrées', path: '/finance/entrees',           icon: TrendingUp,      color: 'text-emerald-500' },";
content = content.replace(oldMenu, newMenu);

fs.writeFileSync(filePath, content);
console.log('✅ Menu ajouté avec succès !');
