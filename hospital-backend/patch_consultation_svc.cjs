const fs = require('fs');
const p = 'src/main/java/com/hospital/backend/service/impl/ConsultationServiceImpl.java';
let c = fs.readFileSync(p, 'utf8');

// Patch getPendingPayments
const old1 = `    public List<com.hospital.backend.dto.PendingPaymentDTO> getPendingPayments() {
        List<Consultation> pendingConsultations = consultationRepository.findByStatus(
                ConsultationStatus.EXAMENS_PRESCRITS
        );

        return pendingConsultations.stream()
                .map(this::mapToPendingPaymentDTO)
                .collect(Collectors.toList());`;

const new1 = `    public List<com.hospital.backend.dto.PendingPaymentDTO> getPendingPayments() {
        Long hId = HospitalTenantContext.getHospitalId();
        List<Consultation> pendingConsultations = consultationRepository.findByStatus(
                ConsultationStatus.EXAMENS_PRESCRITS
        );

        return pendingConsultations.stream()
                .filter(c -> hId == null || (c.getPatient() != null && c.getPatient().getHospital() != null && c.getPatient().getHospital().getId().equals(hId)))
                .map(this::mapToPendingPaymentDTO)
                .collect(Collectors.toList());`;

if (c.includes(old1)) { c = c.replace(old1, new1); console.log('getPendingPayments OK'); }
else { console.error('getPendingPayments NOT FOUND'); }

// Patch getReceptionPendingPayments
const old2 = `    public List<com.hospital.backend.dto.ReceptionPaymentDTO> getReceptionPendingPayments() {
        List<Consultation> pendingConsultations = consultationRepository.findByStatus(
                ConsultationStatus.EXAMENS_PRESCRITS
        );

        return pendingConsultations.stream()
                .map(this::mapToReceptionPaymentDTO)
                .collect(Collectors.toList());`;

const new2 = `    public List<com.hospital.backend.dto.ReceptionPaymentDTO> getReceptionPendingPayments() {
        Long hId = HospitalTenantContext.getHospitalId();
        List<Consultation> pendingConsultations = consultationRepository.findByStatus(
                ConsultationStatus.EXAMENS_PRESCRITS
        );

        return pendingConsultations.stream()
                .filter(c -> hId == null || (c.getPatient() != null && c.getPatient().getHospital() != null && c.getPatient().getHospital().getId().equals(hId)))
                .map(this::mapToReceptionPaymentDTO)
                .collect(Collectors.toList());`;

if (c.includes(old2)) { c = c.replace(old2, new2); console.log('getReceptionPendingPayments OK'); }
else { console.error('getReceptionPendingPayments NOT FOUND'); }

// Patch getTodayProcessedConsultations
const old3 = `    public List<com.hospital.backend.dto.TodayProcessedDTO> getTodayProcessedConsultations() {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);

        List<Consultation> processedConsultations = consultationRepository
                .findByStatusInAndUpdatedAtBetween(
                        List.of(ConsultationStatus.AU_LABO, ConsultationStatus.TERMINE, ConsultationStatus.COMPLETED),
                        startOfDay,
                        endOfDay
                );

        return processedConsultations.stream()
                .map(this::mapToTodayProcessedDTO)
                .collect(Collectors.toList());`;

const new3 = `    public List<com.hospital.backend.dto.TodayProcessedDTO> getTodayProcessedConsultations() {
        Long hId = HospitalTenantContext.getHospitalId();
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);

        List<Consultation> processedConsultations = consultationRepository
                .findByStatusInAndUpdatedAtBetween(
                        List.of(ConsultationStatus.AU_LABO, ConsultationStatus.TERMINE, ConsultationStatus.COMPLETED),
                        startOfDay,
                        endOfDay
                );

        return processedConsultations.stream()
                .filter(c -> hId == null || (c.getPatient() != null && c.getPatient().getHospital() != null && c.getPatient().getHospital().getId().equals(hId)))
                .map(this::mapToTodayProcessedDTO)
                .collect(Collectors.toList());`;

if (c.includes(old3)) { c = c.replace(old3, new3); console.log('getTodayProcessedConsultations OK'); }
else { console.error('getTodayProcessedConsultations NOT FOUND'); }

fs.writeFileSync(p, c, 'utf8');
console.log('Done');
