const fs = require('fs');

const f = 'C:/Users/JUIF/inua/hospital-backend/src/main/java/com/hospital/backend/service/impl/ConsultationServiceImpl.java';
let lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);

// 1. Add imports for Autowired and Lazy if missing
const hasAutowired = lines.some(l => l.includes('import org.springframework.beans.factory.annotation.Autowired'));
const hasLazy = lines.some(l => l.includes('import org.springframework.context.annotation.Lazy'));

let importIdx = lines.findIndex(l => l.startsWith('import org.springframework.stereotype.Service'));
if (importIdx === -1) importIdx = lines.findIndex(l => l.startsWith('import '));

if (!hasAutowired) {
  lines.splice(importIdx, 0, 'import org.springframework.beans.factory.annotation.Autowired;');
  importIdx++;
}
if (!hasLazy) {
  lines.splice(importIdx, 0, 'import org.springframework.context.annotation.Lazy;');
}

// Re-read lines after import changes
lines = lines.join('\n').split(/\r?\n/);

// 2. Replace "private final PrescriptionService prescriptionService;" with field injection
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'private final PrescriptionService prescriptionService;') {
    lines[i] = '    @Autowired\n    @Lazy\n    private PrescriptionService prescriptionService;';
    break;
  }
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('Done');
