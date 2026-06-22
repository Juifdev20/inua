const fs = require('fs');

const f = 'C:/Users/JUIF/inua/hospital-backend/src/main/java/com/hospital/backend/controller/AdminController.java';
let c = fs.readFileSync(f, 'utf8');

// Fix createUser
const oldCreate = 'String deptNom = (String) userData.get("departement");\r\n            if (deptNom != null && !deptNom.isEmpty()) {\r\n                departmentRepository.findByNom(deptNom).ifPresent(user::setDepartment);\r\n            }';
const newCreate = 'String deptNom = (String) userData.get("departement");\r\n            if (deptNom != null && !deptNom.isEmpty()) {\r\n                Long hId = HospitalTenantContext.getHospitalId();\r\n                Optional<Department> deptOpt = (hId != null)\r\n                    ? departmentRepository.findByNomAndHospitalId(deptNom, hId)\r\n                    : departmentRepository.findByNom(deptNom);\r\n                deptOpt.ifPresent(user::setDepartment);\r\n            }';

if (c.includes(oldCreate)) {
  c = c.replace(oldCreate, newCreate);
  console.log('createUser fixed');
} else {
  console.log('createUser pattern NOT found');
}

// Fix updateUser
const oldUpdate = 'String deptNom = (String) userDetails.get("departement");\r\n                if (deptNom != null) {\r\n                    departmentRepository.findByNom(deptNom).ifPresent(user::setDepartment);\r\n                }';
const newUpdate = 'String deptNom = (String) userDetails.get("departement");\r\n                if (deptNom != null) {\r\n                    Long hId = HospitalTenantContext.getHospitalId();\r\n                    Optional<Department> deptOpt = (hId != null)\r\n                        ? departmentRepository.findByNomAndHospitalId(deptNom, hId)\r\n                        : departmentRepository.findByNom(deptNom);\r\n                    deptOpt.ifPresent(user::setDepartment);\r\n                }';

if (c.includes(oldUpdate)) {
  c = c.replace(oldUpdate, newUpdate);
  console.log('updateUser fixed');
} else {
  console.log('updateUser pattern NOT found');
}

fs.writeFileSync(f, c, 'utf8');
console.log('AdminController updated');
