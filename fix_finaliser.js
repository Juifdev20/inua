const fs = require('fs');

const f = 'C:/Users/JUIF/inua/hospital-backend/src/main/java/com/hospital/backend/service/impl/ConsultationServiceImpl.java';
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);

// Find line with "return mapToDTO(saved);" inside finaliserConsultation
let insertIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('return mapToDTO(saved);') && i > 2200) {
    insertIdx = i;
    break;
  }
}

if (insertIdx === -1) {
  console.log('ERROR: could not find insertion point');
  process.exit(1);
}

const newLines = [
  '',
  '            // 💊 Créer la prescription si des items sont fournis (fusion avec /api/prescriptions/create)',
  '            if (request != null && request.getItems() != null && !request.getItems().isEmpty()) {',
  '                List<PrescriptionDTO.PrescriptionItemDTO> prescriptionItems = request.getItems().stream()',
  '                    .map(item -> PrescriptionDTO.PrescriptionItemDTO.builder()',
  '                        .medicationId(item.getMedicationId())',
  '                        .medicationName(item.getMedicationName())',
  '                        .dosage(item.getDosage())',
  '                        .frequency(item.getFrequency())',
  '                        .timeSlots(item.getTimeSlots())',
  '                        .duration(item.getDuration())',
  '                        .quantityPerDose(item.getQuantityPerDose())',
  '                        .instructions(item.getInstructions())',
  '                        .active(item.getActive())',
  '                        .build())',
  '                    .collect(Collectors.toList());',
  '',
  '                PrescriptionDTO prescriptionDTO = PrescriptionDTO.builder()',
  '                    .consultationId(id)',
  '                    .patientId(request.getPatientId())',
  '                    .doctorId(saved.getDoctor() != null ? saved.getDoctor().getId() : null)',
  '                    .notes(request.getNotes() != null ? request.getNotes() : request.getDiagnosticFinal())',
  '                    .status(PrescriptionStatus.PRESCRIPTION_ENVOYEE)',
  '                    .items(prescriptionItems)',
  '                    .build();',
  '',
  '                try {',
  '                    prescriptionService.createPrescription(prescriptionDTO);',
  '                    log.info("✅ [FINALISER] Prescription créée pour consultation {}", id);',
  '                } catch (Exception ex) {',
  '                    log.error("❌ [FINALISER] Erreur création prescription pour consultation {}: {}", id, ex.getMessage());',
  '                }',
  '            }'
];

lines.splice(insertIdx, 0, ...newLines);
fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('Done: inserted at line', insertIdx);
