const fs = require('fs');

// ========== BACKEND: ConsultationServiceImpl ==========
const backendFile = 'C:/Users/JUIF/inua/hospital-backend/src/main/java/com/hospital/backend/service/impl/ConsultationServiceImpl.java';
let backend = fs.readFileSync(backendFile, 'utf8');

// 1. Add import for PrescriptionService
if (!backend.includes('import com.hospital.backend.service.PrescriptionService;')) {
  backend = backend.replace(
    'import com.hospital.backend.service.RevenueService;',
    'import com.hospital.backend.service.RevenueService;\nimport com.hospital.backend.service.PrescriptionService;'
  );
  console.log('✅ Import PrescriptionService added');
} else {
  console.log('ℹ️ Import PrescriptionService already present');
}

// 2. Add field
if (!backend.includes('private final PrescriptionService prescriptionService;')) {
  backend = backend.replace(
    '    private final PatientDocumentService patientDocumentService;',
    '    private final PatientDocumentService patientDocumentService;\n    private final PrescriptionService prescriptionService;'
  );
  console.log('✅ Field prescriptionService added');
} else {
  console.log('ℹ️ Field prescriptionService already present');
}

// 3. Modify finaliserConsultation to also create prescription
const oldFinaliser = `            // 🎯 Génération automatique de la fiche médicale si tout est payé\n            generateDossierIfFullyPaid(saved);\n            \n            return mapToDTO(saved);`;
const newFinaliser = `            // 🎯 Génération automatique de la fiche médicale si tout est payé\n            generateDossierIfFullyPaid(saved);\n            \n            // 💊 Créer la prescription si des items sont fournis (fusion avec /api/prescriptions/create)\n            if (request != null && request.getItems() != null && !request.getItems().isEmpty()) {\n                List<PrescriptionDTO.PrescriptionItemDTO> prescriptionItems = request.getItems().stream()\n                    .map(item -> PrescriptionDTO.PrescriptionItemDTO.builder()\n                        .medicationId(item.getMedicationId())\n                        .medicationName(item.getMedicationName())\n                        .dosage(item.getDosage())\n                        .frequency(item.getFrequency())\n                        .timeSlots(item.getTimeSlots())\n                        .duration(item.getDuration())\n                        .quantityPerDose(item.getQuantityPerDose())\n                        .instructions(item.getInstructions())\n                        .active(item.getActive())\n                        .build())\n                    .collect(Collectors.toList());\n                \n                PrescriptionDTO prescriptionDTO = PrescriptionDTO.builder()\n                    .consultationId(id)\n                    .patientId(request.getPatientId())\n                    .doctorId(saved.getDoctor() != null ? saved.getDoctor().getId() : null)\n                    .notes(request.getNotes() != null ? request.getNotes() : request.getDiagnosticFinal())\n                    .status(PrescriptionStatus.PRESCRIPTION_ENVOYEE)\n                    .items(prescriptionItems)\n                    .build();\n                \n                try {\n                    prescriptionService.createPrescription(prescriptionDTO);\n                    log.info("✅ [FINALISER] Prescription créée pour consultation {}", id);\n                } catch (Exception ex) {\n                    log.error("❌ [FINALISER] Erreur création prescription pour consultation {}: {}", id, ex.getMessage());\n                    // Ne pas bloquer la finalisation si la prescription échoue\n                }\n            }\n            \n            return mapToDTO(saved);`;

if (backend.includes('generateDossierIfFullyPaid(saved);') && backend.includes('return mapToDTO(saved);')) {
  // Replace the specific block
  backend = backend.replace(oldFinaliser, newFinaliser);
  console.log('✅ finaliserConsultation modified');
} else {
  console.log('⚠️ Could not find finaliser block to replace');
}

fs.writeFileSync(backendFile, backend, 'utf8');
console.log('Backend file updated\n');

// ========== FRONTEND: PrescriptionView.jsx ==========
const frontendFile = 'C:/Users/JUIF/inua/hospi-frontend/src/pages/doctor/PrescriptionView.jsx';
let frontend = fs.readFileSync(frontendFile, 'utf8');

// Remove the separate /api/prescriptions/create call and keep only finaliser
const oldBlock = `      // 1. Créer la prescription\n      const response = await fetch(\`\${BACKEND_URL}/api/prescriptions/create\`, {\n        method: 'POST',\n        headers: { \n          'Content-Type': 'application/json',\n          'Authorization': 'Bearer ' + token\n        },\n        body: JSON.stringify(prescriptionData)\n      });\n\n      if (!response.ok) {\n        const errorText = await response.text();\n        toast.error(\`Erreur: \${errorText.substring(0, 100)}\`);\n        return;\n      }\n\n      // 2. Finaliser la consultation (endpoint POST avec /v1/)`;
const newBlock = `      // 1. Finaliser la consultation (crée aussi la prescription en backend)`;

if (frontend.includes(oldBlock)) {
  frontend = frontend.replace(oldBlock, newBlock);
  console.log('✅ Frontend: removed separate /api/prescriptions/create call');
} else {
  console.log('⚠️ Frontend: could not find old block, checking for alternative pattern...');
  // Try alternative: just replace the fetch call to prescriptions/create
  if (frontend.includes('/api/prescriptions/create')) {
    // Remove everything from "// 1. Créer la prescription" up to "// 2. Finaliser"
    const regex = /\/\/ 1\. Créer la prescription[\s\S]*?\/\/ 2\. Finaliser/;
    frontend = frontend.replace(regex, '// 1. Finaliser');
    console.log('✅ Frontend: replaced using regex');
  }
}

fs.writeFileSync(frontendFile, frontend, 'utf8');
console.log('Frontend file updated');
