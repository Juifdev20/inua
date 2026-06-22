const fs = require('fs');

// Fix DepartmentRepository
const repoFile = 'C:/Users/JUIF/inua/hospital-backend/src/main/java/com/hospital/backend/repository/DepartmentRepository.java';
let repo = fs.readFileSync(repoFile, 'utf8');

repo = repo.replace(
  '    // ★ MULTI-TENANT: inclure aussi les départements legacy sans hôpital\n    List<Department> findByHospitalIdOrHospitalIsNull(Long hospitalId);',
  '    // ★ MULTI-TENANT: inclure aussi les départements legacy sans hôpital\n    List<Department> findByHospitalIdOrHospitalIsNull(Long hospitalId);\n\n    // ★ MULTI-TENANT: trouver un département par nom ET hôpital (évite les doublons cross-hospital)\n    Optional<Department> findByNomAndHospitalId(String nom, Long hospitalId);'
);

fs.writeFileSync(repoFile, repo, 'utf8');

// Fix AdminController.createUser and updateUser
const adminFile = 'C:/Users/JUIF/inua/hospital-backend/src/main/java/com/hospital/backend/controller/AdminController.java';
let admin = fs.readFileSync(adminFile, 'utf8');

// Fix createUser department lookup
admin = admin.replace(
  /String deptNom = \(String\) userData\.get\("departement"\);\r?\n            if \(deptNom != null\) \{\r?\n                departmentRepository\.findByNom\(deptNom\)\.ifPresent\(user::setDepartment\);\r?\n            \}/g,
  'String deptNom = (String) userData.get("departement");\n            if (deptNom != null) {\n                Long hId = HospitalTenantContext.getHospitalId();\n                Optional<Department> deptOpt = (hId != null)\n                    ? departmentRepository.findByNomAndHospitalId(deptNom, hId)\n                    : departmentRepository.findByNom(deptNom);\n                deptOpt.ifPresent(user::setDepartment);\n            }'
);

// Fix updateUser department lookup
admin = admin.replace(
  /String deptNom = \(String\) userDetails\.get\("departement"\);\r?\n                if \(deptNom != null\) \{\r?\n                    departmentRepository\.findByNom\(deptNom\)\.ifPresent\(user::setDepartment\);\r?\n                \}/g,
  'String deptNom = (String) userDetails.get("departement");\n                if (deptNom != null) {\n                    Long hId = HospitalTenantContext.getHospitalId();\n                    Optional<Department> deptOpt = (hId != null)\n                        ? departmentRepository.findByNomAndHospitalId(deptNom, hId)\n                        : departmentRepository.findByNom(deptNom);\n                    deptOpt.ifPresent(user::setDepartment);\n                }'
);

fs.writeFileSync(adminFile, admin, 'utf8');

console.log('Done');
