package com.hospital.backend.service.impl;

import com.hospital.backend.dto.CompanyEmployeeRequest;
import com.hospital.backend.dto.CompanyEmployeeResponse;
import com.hospital.backend.dto.CompanyRequest;
import com.hospital.backend.dto.CompanyResponse;
import com.hospital.backend.dto.CompanyStatsDTO;
import com.hospital.backend.entity.Admission;
import com.hospital.backend.entity.Company;
import com.hospital.backend.entity.CompanyEmployee;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.SubscriptionStatus;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.AdmissionRepository;
import com.hospital.backend.repository.CompanyEmployeeRepository;
import com.hospital.backend.repository.CompanyRepository;
import com.hospital.backend.repository.PatientRepository;
import com.hospital.backend.service.CompanyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CompanyServiceImpl implements CompanyService {

    private final CompanyRepository companyRepository;
    private final CompanyEmployeeRepository employeeRepository;
    private final PatientRepository patientRepository;
    private final AdmissionRepository admissionRepository;

    // ============================== COMPANY ==============================

    @Override
    @Transactional(readOnly = true)
    public List<CompanyResponse> getAllCompanies() {
        return companyRepository.findAllByOrderByNameAsc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyResponse> getCompaniesByStatus(SubscriptionStatus status) {
        return companyRepository.findBySubscriptionStatus(status).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyResponse getCompanyById(Long id) {
        Company c = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise introuvable: " + id));
        return toResponse(c);
    }

    @Override
    public CompanyResponse createCompany(CompanyRequest request) {
        if (request.getContractNumber() != null && !request.getContractNumber().isBlank()
                && companyRepository.existsByContractNumber(request.getContractNumber())) {
            throw new IllegalArgumentException("Un contrat avec ce numéro existe déjà: " + request.getContractNumber());
        }

        Company company = Company.builder()
                .name(request.getName())
                .address(request.getAddress())
                .phone(request.getPhone())
                .email(request.getEmail())
                .contactPerson(request.getContactPerson())
                .contractNumber(blankToNull(request.getContractNumber()))
                .subscriptionStatus(request.getSubscriptionStatus() != null
                        ? request.getSubscriptionStatus() : SubscriptionStatus.ACTIVE)
                .coverageRate(request.getCoverageRate() != null
                        ? request.getCoverageRate() : new BigDecimal("100.00"))
                .surplusRate(request.getSurplusRate() != null
                        ? request.getSurplusRate() : new BigDecimal("35.00"))
                .build();

        Company saved = companyRepository.save(company);
        log.info("✅ Entreprise créée: {} (ID={})", saved.getName(), saved.getId());
        return toResponse(saved);
    }

    @Override
    public CompanyResponse updateCompany(Long id, CompanyRequest request) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise introuvable: " + id));

        if (request.getName() != null) company.setName(request.getName());
        if (request.getAddress() != null) company.setAddress(request.getAddress());
        if (request.getPhone() != null) company.setPhone(request.getPhone());
        if (request.getEmail() != null) company.setEmail(request.getEmail());
        if (request.getContactPerson() != null) company.setContactPerson(request.getContactPerson());
        if (request.getContractNumber() != null) company.setContractNumber(blankToNull(request.getContractNumber()));
        if (request.getSubscriptionStatus() != null) company.setSubscriptionStatus(request.getSubscriptionStatus());
        if (request.getCoverageRate() != null) company.setCoverageRate(request.getCoverageRate());
        if (request.getSurplusRate() != null) company.setSurplusRate(request.getSurplusRate());

        Company saved = companyRepository.save(company);
        log.info("✏️ Entreprise mise à jour: {} (ID={})", saved.getName(), saved.getId());
        return toResponse(saved);
    }

    @Override
    public void deleteCompany(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise introuvable: " + id));
        long employees = employeeRepository.findByCompanyIdOrderByCreatedAtDesc(id).size();
        if (employees > 0) {
            throw new IllegalStateException(
                    "Impossible de supprimer cette entreprise: " + employees + " agent(s) associé(s).");
        }
        companyRepository.delete(company);
        log.info("🗑️ Entreprise supprimée ID={}", id);
    }

    // ============================== EMPLOYEES ==============================

    @Override
    @Transactional(readOnly = true)
    public List<CompanyEmployeeResponse> getEmployeesByCompany(Long companyId) {
        // Vérifie l'existence
        companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise introuvable: " + companyId));
        return employeeRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .map(this::toEmployeeResponse)
                .collect(Collectors.toList());
    }

    @Override
    public CompanyEmployeeResponse addEmployee(Long companyId, CompanyEmployeeRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise introuvable: " + companyId));

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient introuvable: " + request.getPatientId()));

        employeeRepository.findByCompanyIdAndPatientId(companyId, patient.getId()).ifPresent(e -> {
            throw new IllegalArgumentException("Ce patient est déjà enregistré comme agent de cette entreprise");
        });

        CompanyEmployee dependantOf = null;
        if (request.getDependantOfId() != null) {
            dependantOf = employeeRepository.findById(request.getDependantOfId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Agent parent introuvable: " + request.getDependantOfId()));
            if (!dependantOf.getCompany().getId().equals(companyId)) {
                throw new IllegalArgumentException("L'agent parent doit appartenir à la même entreprise");
            }
        }

        CompanyEmployee employee = CompanyEmployee.builder()
                .company(company)
                .patient(patient)
                .matricule(blankToNull(request.getMatricule()))
                .dependantOf(dependantOf)
                .isActive(request.getIsActive() == null ? Boolean.TRUE : request.getIsActive())
                .build();

        CompanyEmployee saved = employeeRepository.save(employee);
        log.info("✅ Agent ajouté: patient={} → entreprise={}", patient.getId(), companyId);
        return toEmployeeResponse(saved);
    }

    @Override
    public void deleteEmployee(Long companyId, Long employeeId) {
        CompanyEmployee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent introuvable: " + employeeId));
        if (!employee.getCompany().getId().equals(companyId)) {
            throw new IllegalArgumentException("Cet agent n'appartient pas à cette entreprise");
        }
        employeeRepository.delete(employee);
        log.info("🗑️ Agent supprimé ID={}", employeeId);
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyEmployeeResponse findActiveEmployeeByPatient(Long patientId) {
        return employeeRepository.findFirstByPatientIdAndIsActiveTrue(patientId)
                .map(this::toEmployeeResponse)
                .orElse(null);
    }

    // ============================== MAPPERS ==============================

    private CompanyResponse toResponse(Company c) {
        long count = employeeRepository.findByCompanyIdOrderByCreatedAtDesc(c.getId()).size();
        return CompanyResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .address(c.getAddress())
                .phone(c.getPhone())
                .email(c.getEmail())
                .contactPerson(c.getContactPerson())
                .contractNumber(c.getContractNumber())
                .subscriptionStatus(c.getSubscriptionStatus())
                .coverageRate(c.getCoverageRate())
                .surplusRate(c.getSurplusRate())
                .employeesCount(count)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    private CompanyEmployeeResponse toEmployeeResponse(CompanyEmployee e) {
        Patient p = e.getPatient();
        String firstName = p != null ? p.getFirstName() : null;
        String lastName = p != null ? p.getLastName() : null;
        String fullName = (firstName != null ? firstName : "") +
                (lastName != null ? (firstName != null ? " " : "") + lastName : "");

        String dependantOfName = null;
        Long dependantOfId = null;
        if (e.getDependantOf() != null) {
            dependantOfId = e.getDependantOf().getId();
            Patient dp = e.getDependantOf().getPatient();
            if (dp != null) {
                dependantOfName = (dp.getFirstName() == null ? "" : dp.getFirstName()) + " " +
                        (dp.getLastName() == null ? "" : dp.getLastName());
            }
        }

        return CompanyEmployeeResponse.builder()
                .id(e.getId())
                .companyId(e.getCompany() != null ? e.getCompany().getId() : null)
                .companyName(e.getCompany() != null ? e.getCompany().getName() : null)
                .patientId(p != null ? p.getId() : null)
                .patientCode(p != null ? p.getPatientCode() : null)
                .patientFirstName(firstName)
                .patientLastName(lastName)
                .patientFullName(fullName.isBlank() ? null : fullName)
                .patientPhone(p != null ? p.getPhoneNumber() : null)
                .matricule(e.getMatricule())
                .dependantOfId(dependantOfId)
                .dependantOfName(dependantOfName == null || dependantOfName.isBlank() ? null : dependantOfName)
                .isActive(e.getIsActive())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    // ============================== RAPPORTS & PDF ==============================

    @Override
    @Transactional(readOnly = true)
    public byte[] generateMonthlyConsumptionSheet(Long companyId, String yearMonth) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise introuvable: " + companyId));

        LocalDate startDate = LocalDate.parse(yearMonth + "-01");
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(23, 59, 59);

        List<Admission> admissions = admissionRepository.findByCompanyIdAndAdmissionDateBetween(companyId, start, end);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            com.lowagie.text.Document doc = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4);
            com.lowagie.text.pdf.PdfWriter.getInstance(doc, baos);
            doc.open();

            // Titre
            com.lowagie.text.Font titleFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 18, com.lowagie.text.Font.BOLD);
            com.lowagie.text.Font subtitleFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 12, com.lowagie.text.Font.NORMAL);
            com.lowagie.text.Font boldFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 10, com.lowagie.text.Font.BOLD);
            com.lowagie.text.Font normalFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 9, com.lowagie.text.Font.NORMAL);

            doc.add(new com.lowagie.text.Paragraph("FEUILLE DE CONSOMMATION MENSUELLE", titleFont));
            doc.add(new com.lowagie.text.Paragraph("Entreprise : " + company.getName(), subtitleFont));
            doc.add(new com.lowagie.text.Paragraph("Période : " + yearMonth, subtitleFont));
            doc.add(new com.lowagie.text.Paragraph("Contrat : " + (company.getContractNumber() != null ? company.getContractNumber() : "—"), subtitleFont));
            doc.add(new com.lowagie.text.Paragraph(" "));

            // Tableau
            com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(7);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{2.5f, 3.5f, 2f, 2f, 2f, 2f, 2f});

            String[] headers = {"Date", "Patient", "Matricule", "Service", "Total", "Prise en charge", "Ticket modeste"};
            for (String h : headers) {
                com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(h, boldFont));
                cell.setBackgroundColor(new java.awt.Color(230, 230, 230));
                table.addCell(cell);
            }

            BigDecimal totalTotal = BigDecimal.ZERO;
            BigDecimal totalCoverage = BigDecimal.ZERO;
            BigDecimal totalSurplus = BigDecimal.ZERO;
            DateTimeFormatter df = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

            for (Admission adm : admissions) {
                table.addCell(new com.lowagie.text.Phrase(adm.getAdmissionDate() != null ? adm.getAdmissionDate().format(df) : "—", normalFont));
                String patientName = adm.getPatient() != null
                        ? (adm.getPatient().getFirstName() + " " + adm.getPatient().getLastName()) : "—";
                table.addCell(new com.lowagie.text.Phrase(patientName, normalFont));
                table.addCell(new com.lowagie.text.Phrase(adm.getMatricule() != null ? adm.getMatricule() : "—", normalFont));
                table.addCell(new com.lowagie.text.Phrase(adm.getReasonForVisit() != null ? adm.getReasonForVisit() : "—", normalFont));

                BigDecimal total = adm.getTotalAmount() != null ? adm.getTotalAmount() : BigDecimal.ZERO;
                BigDecimal cov = adm.getCompanyCoverage() != null ? adm.getCompanyCoverage() : BigDecimal.ZERO;
                BigDecimal sur = adm.getPatientSurplus() != null ? adm.getPatientSurplus() : BigDecimal.ZERO;

                table.addCell(new com.lowagie.text.Phrase(total.setScale(2, RoundingMode.HALF_UP).toString() + " $", normalFont));
                table.addCell(new com.lowagie.text.Phrase(cov.setScale(2, RoundingMode.HALF_UP).toString() + " $", normalFont));
                table.addCell(new com.lowagie.text.Phrase(sur.setScale(2, RoundingMode.HALF_UP).toString() + " $", normalFont));

                totalTotal = totalTotal.add(total);
                totalCoverage = totalCoverage.add(cov);
                totalSurplus = totalSurplus.add(sur);
            }

            // Ligne totaux
            com.lowagie.text.pdf.PdfPCell totalLabel = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("TOTAL", boldFont));
            totalLabel.setColspan(4);
            table.addCell(totalLabel);
            table.addCell(new com.lowagie.text.Phrase(totalTotal.setScale(2, RoundingMode.HALF_UP).toString() + " $", boldFont));
            table.addCell(new com.lowagie.text.Phrase(totalCoverage.setScale(2, RoundingMode.HALF_UP).toString() + " $", boldFont));
            table.addCell(new com.lowagie.text.Phrase(totalSurplus.setScale(2, RoundingMode.HALF_UP).toString() + " $", boldFont));

            doc.add(table);
            doc.add(new com.lowagie.text.Paragraph(" "));

            doc.add(new com.lowagie.text.Paragraph("Nombre d'admissions : " + admissions.size(), subtitleFont));
            doc.add(new com.lowagie.text.Paragraph("Taux de couverture : " + (company.getCoverageRate() != null ? company.getCoverageRate().toString() : "100") + "%", subtitleFont));

            doc.close();
            log.info("📄 Feuille de consommation générée - entreprise={}, période={}, admissions={}", company.getName(), yearMonth, admissions.size());
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erreur génération PDF feuille de consommation", e);
            throw new RuntimeException("Impossible de générer le PDF : " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyStatsDTO getCompanyStats(Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise introuvable: " + companyId));
        return buildStats(company);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyStatsDTO> getAllCompaniesStats() {
        return companyRepository.findAllByOrderByNameAsc().stream()
                .map(this::buildStats)
                .collect(Collectors.toList());
    }

    private CompanyStatsDTO buildStats(Company company) {
        Long companyId = company.getId();
        List<CompanyEmployee> employees = employeeRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
        long activeEmployees = employees.stream().filter(e -> Boolean.TRUE.equals(e.getIsActive())).count();

        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime now = LocalDateTime.now();
        List<Admission> currentMonth = admissionRepository.findByCompanyIdAndAdmissionDateBetween(companyId, startOfMonth, now);

        BigDecimal totalCoverageCurrentMonth = currentMonth.stream()
                .map(a -> a.getCompanyCoverage() != null ? a.getCompanyCoverage() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalSurplusCurrentMonth = currentMonth.stream()
                .map(a -> a.getPatientSurplus() != null ? a.getPatientSurplus() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Admission> allTime = admissionRepository.findByCompanyIdAndAdmissionDateBetween(companyId,
                LocalDateTime.of(2000, 1, 1, 0, 0), now);
        BigDecimal totalCoverageAllTime = allTime.stream()
                .map(a -> a.getCompanyCoverage() != null ? a.getCompanyCoverage() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalSurplusAllTime = allTime.stream()
                .map(a -> a.getPatientSurplus() != null ? a.getPatientSurplus() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CompanyStatsDTO.builder()
                .companyId(company.getId())
                .companyName(company.getName())
                .totalEmployees((long) employees.size())
                .activeEmployees(activeEmployees)
                .totalAdmissionsCurrentMonth((long) currentMonth.size())
                .totalCompanyCoverageCurrentMonth(totalCoverageCurrentMonth)
                .totalPatientSurplusCurrentMonth(totalSurplusCurrentMonth)
                .totalCompanyCoverageAllTime(totalCoverageAllTime)
                .totalPatientSurplusAllTime(totalSurplusAllTime)
                .build();
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
