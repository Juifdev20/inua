const fs = require('fs');

const f = 'C:/Users/JUIF/inua/hospital-backend/src/main/java/com/hospital/backend/repository/DepartmentRepository.java';
let c = fs.readFileSync(f, 'utf8');

// Append before the final closing brace
const idx = c.lastIndexOf('}');
if (idx !== -1) {
  c = c.slice(0, idx) + '\n    // MULTI-TENANT: trouver un departement par nom ET hopital (evite les doublons cross-hospital)\n    Optional<Department> findByNomAndHospitalId(String nom, Long hospitalId);\n' + c.slice(idx);
  fs.writeFileSync(f, c, 'utf8');
  console.log('Repo done');
} else {
  console.log('No } found');
}
