const fs = require('fs');
const p = 'src/main/java/com/hospital/backend/controller/DoctorController.java';
let c = fs.readFileSync(p, 'utf8');

// Add import
if (!c.includes('HospitalTenantContext')) {
  c = c.replace(
    'import com.hospital.backend.service.ConsultationService;',
    'import com.hospital.backend.security.HospitalTenantContext;\nimport com.hospital.backend.service.ConsultationService;'
  );
  fs.writeFileSync(p, c, 'utf8');
  console.log('DoctorController import OK');
} else {
  console.log('Import already present');
}
