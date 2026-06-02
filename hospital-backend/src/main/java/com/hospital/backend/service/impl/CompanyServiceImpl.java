package com.hospital.backend.service.impl;

import com.hospital.backend.dto.CompanyEmployeeRequest;
import com.hospital.backend.dto.CompanyEmployeeResponse;
import com.hospital.backend.dto.CompanyRequest;
import com.hospital.backend.dto.CompanyResponse;
import com.hospital.backend.dto.CompanyStatsDTO;
import com.hospital.backend.dto.ConsumptionRecordDTO;
import com.hospital.backend.dto.PatientConsumptionSummaryDTO;
import com.hospital.backend.entity.Admission;
import com.hospital.backend.entity.Company;
import com.hospital.backend.entity.CompanyConsumptionRecord;
import com.hospital.backend.entity.CompanyEmployee;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.HospitalConfig;
import com.hospital.backend.entity.SubscriptionStatus;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.AdmissionRepository;
import com.hospital.backend.repository.CompanyEmployeeRepository;
import com.hospital.backend.repository.CompanyRepository;
import com.hospital.backend.repository.HospitalConfigRepository;
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
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CompanyServiceImpl implements CompanyService {

    private final CompanyRepository companyRepository;
    private final CompanyEmployeeRepository employeeRepository;
    private final PatientRepository patientRepository;
    private final com.hospital.backend.repository.CompanyConsumptionRecordRepository consumptionRecordRepository;
    private final AdmissionRepository admissionRepository;
    private final HospitalConfigRepository hospitalConfigRepository;

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

        // ── Même source que l'écran : admission.companyCoverage pour la consultation ──
        List<PatientConsumptionSummaryDTO> summaries = getPatientConsumptionSummaries(companyId, yearMonth);

        HospitalConfig cfg = hospitalConfigRepository.findFirstByOrderByIdAsc().orElse(null);

        log.info("🔍 [DEBUG] Config récupérée: {}", cfg != null ? "OK" : "NULL");
        if (cfg != null) {
            log.info("🔍 [DEBUG] Logo URL: {}", cfg.getHospitalLogoUrl());
            log.info("🔍 [DEBUG] Enable logo on documents: {}", cfg.getEnableLogoOnDocuments());
        }

        // ── Couleurs depuis la config ──────────────────────────────────────────
        java.awt.Color primaryColor   = parseHexColor(cfg != null ? cfg.getPrimaryColor()   : null, new java.awt.Color(30, 64, 175));
        java.awt.Color secondaryColor = parseHexColor(cfg != null ? cfg.getSecondaryColor() : null, new java.awt.Color(239, 246, 255));
        java.awt.Color lightGray      = new java.awt.Color(245, 245, 245);
        java.awt.Color borderGray     = new java.awt.Color(200, 200, 200);
        java.awt.Color darkText       = new java.awt.Color(30, 30, 30);
        java.awt.Color mutedText      = new java.awt.Color(100, 100, 100);

        // ── Symbole de devise ─────────────────────────────────────────────────
        String sym = (cfg != null && cfg.getCurrencySymbol() != null
                && !cfg.getCurrencySymbol().isBlank()) ? cfg.getCurrencySymbol() : "$";

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            com.lowagie.text.Document doc = new com.lowagie.text.Document(
                    com.lowagie.text.PageSize.A4, 40, 40, 45, 45);
            com.lowagie.text.pdf.PdfWriter writer =
                    com.lowagie.text.pdf.PdfWriter.getInstance(doc, baos);
            doc.open();

            // ── Polices ────────────────────────────────────────────────────────
            com.lowagie.text.Font fTitle    = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 15, com.lowagie.text.Font.BOLD,   darkText);
            com.lowagie.text.Font fHospName = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 11, com.lowagie.text.Font.BOLD,   primaryColor);
            com.lowagie.text.Font fHospInfo = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA,  8, com.lowagie.text.Font.NORMAL, mutedText);
            com.lowagie.text.Font fInfo     = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 10, com.lowagie.text.Font.NORMAL, darkText);
            com.lowagie.text.Font fNormal   = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA,  8, com.lowagie.text.Font.NORMAL, darkText);
            com.lowagie.text.Font fHeader   = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA,  9, com.lowagie.text.Font.BOLD,   java.awt.Color.WHITE);
            com.lowagie.text.Font fTotal    = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA,  9, com.lowagie.text.Font.BOLD,   darkText);
            com.lowagie.text.Font fFooter   = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA,  8, com.lowagie.text.Font.ITALIC, mutedText);
            com.lowagie.text.Font fSig      = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA,  8, com.lowagie.text.Font.NORMAL, mutedText);

            // ══════════════════════════════════════════════════════════════════
            // EN-TÊTE HÔPITAL (logo gauche | infos droite)
            // ══════════════════════════════════════════════════════════════════
            com.lowagie.text.pdf.PdfPTable headerTbl = new com.lowagie.text.pdf.PdfPTable(2);
            headerTbl.setWidthPercentage(100);
            headerTbl.setWidths(new float[]{1.3f, 4f});
            headerTbl.setSpacingAfter(6f);

            // Cellule logo
            com.lowagie.text.pdf.PdfPCell logoCell = new com.lowagie.text.pdf.PdfPCell();
            logoCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
            logoCell.setPadding(2f);
            boolean logoAdded = false;
            boolean logoEnabled = cfg != null && (cfg.getEnableLogoOnDocuments() == null || Boolean.TRUE.equals(cfg.getEnableLogoOnDocuments()));
            if (logoEnabled
                    && cfg.getHospitalLogoUrl() != null && !cfg.getHospitalLogoUrl().isBlank()) {
                try {
                    com.lowagie.text.Image logo;
                    String hospitalLogoUrl = cfg.getHospitalLogoUrl();
                    log.info("🔍 [DEBUG] Tentative de chargement du logo: {}", hospitalLogoUrl.substring(0, Math.min(50, hospitalLogoUrl.length())));
                    if (hospitalLogoUrl.startsWith("data:image")) {
                        // Gérer les images en base64
                        String base64Data = hospitalLogoUrl.substring(hospitalLogoUrl.indexOf(",") + 1);
                        byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Data);
                        logo = com.lowagie.text.Image.getInstance(imageBytes);
                        log.info("✅ [DEBUG] Logo chargé depuis base64");
                    } else if (hospitalLogoUrl.startsWith("http://") || hospitalLogoUrl.startsWith("https://")) {
                        // Gérer les URLs HTTP/HTTPS
                        logo = com.lowagie.text.Image.getInstance(new java.net.URL(hospitalLogoUrl));
                        log.info("✅ [DEBUG] Logo chargé depuis URL");
                    } else {
                        // Gérer les chemins locaux
                        logo = com.lowagie.text.Image.getInstance(hospitalLogoUrl);
                        log.info("✅ [DEBUG] Logo chargé depuis chemin local");
                    }
                    logo.scaleToFit(80f, 80f);
                    logoCell.addElement(logo);
                    logoAdded = true;
                    log.info("✅ [DEBUG] Logo ajouté au PDF");
                } catch (Exception ex) {
                    log.error("❌ [DEBUG] Erreur chargement logo hôpital: {}", ex.getMessage(), ex);
                }
            } else {
                log.warn("⚠️ [DEBUG] Logo non chargé - cfg={}, enableLogo={}, logoUrl={}",
                    cfg != null,
                    cfg != null ? cfg.getEnableLogoOnDocuments() : null,
                    cfg != null ? (cfg.getHospitalLogoUrl() != null ? cfg.getHospitalLogoUrl().substring(0, Math.min(50, cfg.getHospitalLogoUrl().length())) : "NULL") : "NULL");
            }
            if (!logoAdded) logoCell.addElement(new com.lowagie.text.Phrase(""));
            headerTbl.addCell(logoCell);

            // Cellule infos hôpital
            com.lowagie.text.pdf.PdfPCell hospCell = new com.lowagie.text.pdf.PdfPCell();
            hospCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
            hospCell.setPadding(2f);
            hospCell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
            String hospName = (cfg != null && cfg.getHospitalName() != null)
                    ? cfg.getHospitalName() : "ÉTABLISSEMENT";
            hospCell.addElement(new com.lowagie.text.Paragraph(hospName.toUpperCase(), fHospName));
            if (cfg != null) {
                if (cfg.getMinistryName()   != null && !cfg.getMinistryName().isBlank())
                    hospCell.addElement(new com.lowagie.text.Paragraph(cfg.getMinistryName(), fHospInfo));
                if (cfg.getDepartmentName() != null && !cfg.getDepartmentName().isBlank())
                    hospCell.addElement(new com.lowagie.text.Paragraph(cfg.getDepartmentName(), fHospInfo));
                if (cfg.getZoneName()       != null && !cfg.getZoneName().isBlank())
                    hospCell.addElement(new com.lowagie.text.Paragraph(cfg.getZoneName(), fHospInfo));
                if (cfg.getAddress()        != null && !cfg.getAddress().isBlank())
                    hospCell.addElement(new com.lowagie.text.Paragraph(cfg.getAddress(), fHospInfo));
                // Contacts sur une ligne
                StringBuilder contact = new StringBuilder();
                if (cfg.getPhoneNumber() != null && !cfg.getPhoneNumber().isBlank())
                    contact.append(cfg.getPhoneNumber());
                if (cfg.getEmail() != null && !cfg.getEmail().isBlank()) {
                    if (contact.length() > 0) contact.append("  |  ");
                    contact.append(cfg.getEmail());
                }
                if (contact.length() > 0)
                    hospCell.addElement(new com.lowagie.text.Paragraph(contact.toString(), fHospInfo));
            }
            headerTbl.addCell(hospCell);
            doc.add(headerTbl);

            // Barre de séparation couleur primaire
            com.lowagie.text.pdf.PdfPTable divBar = new com.lowagie.text.pdf.PdfPTable(1);
            divBar.setWidthPercentage(100);
            divBar.setSpacingAfter(10f);
            com.lowagie.text.pdf.PdfPCell divCell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(" "));
            divCell.setBackgroundColor(primaryColor);
            divCell.setFixedHeight(3f);
            divCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
            divBar.addCell(divCell);
            doc.add(divBar);

            // ══════════════════════════════════════════════════════════════════
            // TITRE + INFORMATIONS ENTREPRISE
            // ══════════════════════════════════════════════════════════════════
            com.lowagie.text.Paragraph titlePar = new com.lowagie.text.Paragraph(
                    "FEUILLE DE CONSOMMATION MENSUELLE", fTitle);
            titlePar.setSpacingAfter(8f);
            doc.add(titlePar);

            doc.add(new com.lowagie.text.Paragraph("Entreprise          : " + company.getName(), fInfo));
            doc.add(new com.lowagie.text.Paragraph("Période             : " + yearMonth, fInfo));
            doc.add(new com.lowagie.text.Paragraph("Contrat             : " +
                    (company.getContractNumber() != null ? company.getContractNumber() : "—"), fInfo));
            doc.add(new com.lowagie.text.Paragraph("Taux de couverture  : " +
                    (company.getCoverageRate() != null
                            ? company.getCoverageRate().setScale(2, RoundingMode.HALF_UP).toPlainString()
                            : "100.00") + "%", fInfo));
            doc.add(new com.lowagie.text.Paragraph(" "));

            // ══════════════════════════════════════════════════════════════════
            // TABLEAU : Date | Patient | Matricule | Flux | Service | Total | Prise en charge | Ticket modeste
            // ══════════════════════════════════════════════════════════════════
            com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(8);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.8f, 3f, 1.8f, 2f, 2.2f, 1.8f, 2.2f, 2.2f});
            table.setSpacingAfter(6f);

            // Ligne d'en-têtes (une seule ligne par patient avec colonnes par service)
            String[] colHeaders = {"Date", "Patient", "Matricule", "Consultation", "Labo", "Pharmacie",
                                   "Total", "Prise en charge", "Ticket modeste"};
            for (String h : colHeaders) {
                com.lowagie.text.pdf.PdfPCell hCell =
                        new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(h, fHeader));
                hCell.setBackgroundColor(primaryColor);
                hCell.setPadding(5f);
                hCell.setBorderColor(borderGray);
                table.addCell(hCell);
            }

            // Lignes de données (une ligne par patient)
            BigDecimal sumTotal    = BigDecimal.ZERO;
            BigDecimal sumCoverage = BigDecimal.ZERO;
            BigDecimal sumSurplus  = BigDecimal.ZERO;
            DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            boolean alt = false;
            int patientCount = 0;

            for (PatientConsumptionSummaryDTO s : summaries) {
                String dateStr   = s.getAdmissionDate() != null ? s.getAdmissionDate().format(dateFmt) : "—";
                String patNom    = s.getPatientName()   != null ? s.getPatientName()   : "—";
                String matricule = s.getMatricule()     != null ? s.getMatricule()     : "—";

                BigDecimal consultationTotal = nvl(s.getConsultationAmount());
                BigDecimal laboTotal         = nvl(s.getLaboAmount());
                BigDecimal pharmacieTotal    = nvl(s.getPharmacieAmount());
                BigDecimal patientTotal      = nvl(s.getTotalAmount());
                BigDecimal patientCoverage   = nvl(s.getTotalCoverage());
                BigDecimal patientSurplus    = nvl(s.getTotalSurplus());

                java.awt.Color rowBg = alt ? lightGray : java.awt.Color.WHITE;
                alt = !alt;

                String[] vals = {
                    dateStr, patNom, matricule,
                    pdfAmt(consultationTotal, sym),
                    pdfAmt(laboTotal, sym),
                    pdfAmt(pharmacieTotal, sym),
                    pdfAmt(patientTotal, sym),
                    pdfAmt(patientCoverage, sym),
                    pdfAmt(patientSurplus, sym)
                };
                for (String v : vals) {
                    com.lowagie.text.pdf.PdfPCell c =
                            new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(v, fNormal));
                    c.setBackgroundColor(rowBg);
                    c.setPadding(4f);
                    c.setBorderColor(borderGray);
                    table.addCell(c);
                }
                sumTotal    = sumTotal.add(patientTotal);
                sumCoverage = sumCoverage.add(patientCoverage);
                sumSurplus  = sumSurplus.add(patientSurplus);
                patientCount++;
            }

            // Ligne TOTAL
            com.lowagie.text.pdf.PdfPCell totLabelCell =
                    new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("TOTAL", fTotal));
            totLabelCell.setColspan(6);
            totLabelCell.setBackgroundColor(secondaryColor);
            totLabelCell.setPadding(5f);
            totLabelCell.setBorderColor(borderGray);
            table.addCell(totLabelCell);

            for (String v : new String[]{pdfAmt(sumTotal, sym), pdfAmt(sumCoverage, sym), pdfAmt(sumSurplus, sym)}) {
                com.lowagie.text.pdf.PdfPCell c =
                        new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(v, fTotal));
                c.setBackgroundColor(secondaryColor);
                c.setPadding(5f);
                c.setBorderColor(borderGray);
                table.addCell(c);
            }
            doc.add(table);

            // ══════════════════════════════════════════════════════════════════
            // PIED DE PAGE
            // ══════════════════════════════════════════════════════════════════
            doc.add(new com.lowagie.text.Paragraph("Nombre de patients : " + patientCount, fInfo));

            if (cfg != null && cfg.getFooterText() != null && !cfg.getFooterText().isBlank()) {
                doc.add(new com.lowagie.text.Paragraph(" "));
                doc.add(new com.lowagie.text.Paragraph(cfg.getFooterText(), fFooter));
            }

            // Ligne de signature (si activée dans la config)
            if (cfg != null && Boolean.TRUE.equals(cfg.getEnableSignature())) {
                doc.add(new com.lowagie.text.Paragraph(" "));
                doc.add(new com.lowagie.text.Paragraph(" "));
                com.lowagie.text.pdf.PdfPTable sigTbl = new com.lowagie.text.pdf.PdfPTable(2);
                sigTbl.setWidthPercentage(85);
                sigTbl.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
                for (String label : new String[]{"Responsable Entreprise", "Directeur Médical"}) {
                    com.lowagie.text.pdf.PdfPCell sc = new com.lowagie.text.pdf.PdfPCell();
                    sc.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
                    sc.setPaddingTop(18f);
                    sc.addElement(new com.lowagie.text.Paragraph("Signature : " + label, fSig));
                    sc.addElement(new com.lowagie.text.Paragraph("_______________________________", fSig));
                    sigTbl.addCell(sc);
                }
                doc.add(sigTbl);
            }

            // Filigrane (si activé)
            if (cfg != null && Boolean.TRUE.equals(cfg.getEnableWatermark())
                    && cfg.getDocumentWatermark() != null && !cfg.getDocumentWatermark().isBlank()) {
                try {
                    com.lowagie.text.pdf.PdfContentByte cb = writer.getDirectContentUnder();
                    com.lowagie.text.pdf.BaseFont wFont = com.lowagie.text.pdf.BaseFont.createFont(
                            com.lowagie.text.pdf.BaseFont.HELVETICA,
                            com.lowagie.text.pdf.BaseFont.CP1252, false);
                    cb.saveState();
                    cb.beginText();
                    cb.setFontAndSize(wFont, 55);
                    cb.setColorFill(new java.awt.Color(210, 210, 210));
                    cb.showTextAligned(com.lowagie.text.Element.ALIGN_CENTER,
                            cfg.getDocumentWatermark(),
                            doc.getPageSize().getWidth() / 2f,
                            doc.getPageSize().getHeight() / 2f,
                            45f);
                    cb.endText();
                    cb.restoreState();
                } catch (Exception wex) {
                    log.warn("Impossible d'appliquer le filigrane: {}", wex.getMessage());
                }
            }

            doc.close();
            log.info("📄 PDF feuille de consommation - entreprise={}, période={}, patients={}",
                    company.getName(), yearMonth, patientCount);
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
    public List<CompanyStatsDTO> getAllCompaniesStats(String yearMonth) {
        // ── Optimisation : ne charger que les entreprises actives pour éviter OOM ─────────
        return companyRepository.findBySubscriptionStatusOrderByCreatedAtDesc(
                SubscriptionStatus.ACTIVE).stream()
                .map(c -> buildStats(c, yearMonth))
                .collect(Collectors.toList());
    }

    private CompanyStatsDTO buildStats(Company company, String yearMonth) {
        Long companyId = company.getId();
        List<CompanyEmployee> employees = employeeRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
        long activeEmployees = employees.stream().filter(e -> Boolean.TRUE.equals(e.getIsActive())).count();

        LocalDateTime startOfMonth;
        LocalDateTime endOfMonth;
        if (yearMonth != null && !yearMonth.isBlank()) {
            LocalDate startDate = LocalDate.parse(yearMonth + "-01");
            startOfMonth = startDate.atStartOfDay();
            endOfMonth = startDate.plusMonths(1).minusDays(1).atTime(23, 59, 59);
        } else {
            startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
            endOfMonth = LocalDateTime.now();
        }

        long admissionCount = consumptionRecordRepository.countByCompanyIdAndConsumedAtBetween(companyId, startOfMonth, endOfMonth);
        BigDecimal totalCoverageCurrentMonth = consumptionRecordRepository
                .sumCompanyCoverageByCompanyAndPeriod(companyId, startOfMonth, endOfMonth);
        BigDecimal totalSurplusCurrentMonth = consumptionRecordRepository
                .sumPatientSurplusByCompanyAndPeriod(companyId, startOfMonth, endOfMonth);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime allTimeStart = LocalDateTime.of(2000, 1, 1, 0, 0);
        BigDecimal totalCoverageAllTime = consumptionRecordRepository
                .sumCompanyCoverageByCompanyAndPeriod(companyId, allTimeStart, now);
        BigDecimal totalSurplusAllTime = consumptionRecordRepository
                .sumPatientSurplusByCompanyAndPeriod(companyId, allTimeStart, now);

        return CompanyStatsDTO.builder()
                // Identité
                .id(company.getId())
                .name(company.getName())
                .contactPerson(company.getContactPerson())
                .subscriptionStatus(company.getSubscriptionStatus())
                .coverageRate(company.getCoverageRate())
                // Employés
                .employeeCount((long) employees.size())
                .activeEmployeeCount(activeEmployees)
                // Flux mois courant
                .admissionCount(admissionCount)
                .totalCompanyCoverage(totalCoverageCurrentMonth)
                .totalPatientSurplus(totalSurplusCurrentMonth)
                // Historique
                .totalCompanyCoverageAllTime(totalCoverageAllTime)
                .totalPatientSurplusAllTime(totalSurplusAllTime)
                // Legacy
                .companyId(company.getId())
                .companyName(company.getName())
                .totalEmployees((long) employees.size())
                .activeEmployees(activeEmployees)
                .totalAdmissionsCurrentMonth(admissionCount)
                .totalCompanyCoverageCurrentMonth(totalCoverageCurrentMonth)
                .totalPatientSurplusCurrentMonth(totalSurplusCurrentMonth)
                .build();
    }

    // Overload for single-company stats (uses current month)
    private CompanyStatsDTO buildStats(Company company) {
        return buildStats(company, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConsumptionRecordDTO> getConsumptionRecords(Long companyId, String yearMonth) {
        companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise introuvable: " + companyId));

        LocalDate startDate = LocalDate.parse(yearMonth + "-01");
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(23, 59, 59);

        return consumptionRecordRepository
                .findByCompanyIdAndConsumedAtBetweenOrderByConsumedAtDesc(companyId, start, end)
                .stream()
                .map(r -> ConsumptionRecordDTO.builder()
                        .id(r.getId())
                        .patientId(r.getPatient() != null ? r.getPatient().getId() : null)
                        .patientName(r.getPatient() != null
                                ? r.getPatient().getFirstName() + " " + r.getPatient().getLastName() : "—")
                        .matricule(r.getMatricule())
                        .fluxType(r.getFluxType() != null ? r.getFluxType().name() : null)
                        .description(r.getDescription())
                        .totalAmount(r.getTotalAmount())
                        .companyCoverage(r.getCompanyCoverage())
                        .patientSurplus(r.getPatientSurplus())
                        .coverageRate(r.getCoverageRate())
                        .consumedAt(r.getConsumedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PatientConsumptionSummaryDTO> getPatientConsumptionSummaries(Long companyId, String yearMonth) {
        companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise introuvable: " + companyId));

        LocalDate startDate = LocalDate.parse(yearMonth + "-01");
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(23, 59, 59);

        List<Admission> admissions = admissionRepository
                .findByCompanyIdAndAdmissionDateBetween(companyId, start, end);

        // ✅ Grouper par patient (patientId) pour avoir une seule ligne par patient
        Map<Long, List<Admission>> admissionsByPatient = admissions.stream()
                .filter(adm -> adm.getPatient() != null)
                .collect(Collectors.groupingBy(adm -> adm.getPatient().getId()));

        return admissionsByPatient.entrySet().stream().map(entry -> {
            Long patientId = entry.getKey();
            List<Admission> patientAdmissions = entry.getValue();

            // Prendre la première admission pour les infos de base
            Admission firstAdm = patientAdmissions.get(0);

            // ── CONSULTATION : sommer depuis toutes les admissions du patient ─────────────
            BigDecimal consultationAmount   = BigDecimal.ZERO;
            BigDecimal consultationCoverage = BigDecimal.ZERO;
            BigDecimal consultationSurplus  = BigDecimal.ZERO;

            for (Admission adm : patientAdmissions) {
                consultationCoverage = consultationCoverage.add(
                    adm.getCompanyCoverage() != null ? adm.getCompanyCoverage() : BigDecimal.ZERO);
                consultationSurplus = consultationSurplus.add(
                    adm.getPatientSurplus() != null ? adm.getPatientSurplus() : BigDecimal.ZERO);
            }
            consultationAmount = consultationCoverage.add(consultationSurplus);

            // ── LABO : records liés à toutes les admissions du patient ──
            BigDecimal laboAmount   = BigDecimal.ZERO;
            BigDecimal laboCoverage = BigDecimal.ZERO;
            BigDecimal laboSurplus  = BigDecimal.ZERO;

            for (Admission adm : patientAdmissions) {
                List<CompanyConsumptionRecord> laboRecs =
                        consumptionRecordRepository.findByAdmissionId(adm.getId());
                for (CompanyConsumptionRecord r : laboRecs) {
                    if (r.getFluxType() != CompanyConsumptionRecord.FluxType.LABO) continue;
                    laboAmount   = laboAmount.add(  r.getTotalAmount()     != null ? r.getTotalAmount()     : BigDecimal.ZERO);
                    laboCoverage = laboCoverage.add(r.getCompanyCoverage() != null ? r.getCompanyCoverage() : BigDecimal.ZERO);
                    laboSurplus  = laboSurplus.add( r.getPatientSurplus()  != null ? r.getPatientSurplus()  : BigDecimal.ZERO);
                }
            }

            // ── PHARMACIE : records par patient+entreprise+mois ──
            BigDecimal pharmacieAmount   = BigDecimal.ZERO;
            BigDecimal pharmacieCoverage = BigDecimal.ZERO;
            BigDecimal pharmacieSurplus  = BigDecimal.ZERO;

            List<CompanyConsumptionRecord> pharmRecs =
                    consumptionRecordRepository
                            .findByCompanyIdAndPatientIdAndFluxTypeAndConsumedAtBetween(
                                    companyId, patientId,
                                    CompanyConsumptionRecord.FluxType.PHARMACIE,
                                    start, end);
            for (CompanyConsumptionRecord r : pharmRecs) {
                pharmacieAmount   = pharmacieAmount.add(  r.getTotalAmount()     != null ? r.getTotalAmount()     : BigDecimal.ZERO);
                pharmacieCoverage = pharmacieCoverage.add(r.getCompanyCoverage() != null ? r.getCompanyCoverage() : BigDecimal.ZERO);
                pharmacieSurplus  = pharmacieSurplus.add( r.getPatientSurplus()  != null ? r.getPatientSurplus()  : BigDecimal.ZERO);
            }

            BigDecimal totalAmount   = consultationAmount.add(laboAmount).add(pharmacieAmount);
            BigDecimal totalCoverage = consultationCoverage.add(laboCoverage).add(pharmacieCoverage);
            BigDecimal totalSurplus  = consultationSurplus.add(laboSurplus).add(pharmacieSurplus);

            String patientName = firstAdm.getPatient() != null
                    ? firstAdm.getPatient().getFirstName() + " " + firstAdm.getPatient().getLastName() : "—";

            return PatientConsumptionSummaryDTO.builder()
                    .admissionId(firstAdm.getId())  // ID de la première admission
                    .patientId(patientId)
                    .patientName(patientName)
                    .matricule(firstAdm.getMatricule())
                    .admissionDate(firstAdm.getAdmissionDate())  // Date de la première admission
                    .admissionStatus(firstAdm.getStatus() != null ? firstAdm.getStatus().name() : null)
                    .coverageRate(firstAdm.getCoverageRate())
                    .consultationAmount(consultationAmount)
                    .laboAmount(laboAmount)
                    .pharmacieAmount(pharmacieAmount)
                    .consultationCoverage(consultationCoverage)
                    .laboCoverage(laboCoverage)
                    .pharmacieCoverage(pharmacieCoverage)
                    .consultationSurplus(consultationSurplus)
                    .laboSurplus(laboSurplus)
                    .pharmacieSurplus(pharmacieSurplus)
                    .totalAmount(totalAmount)
                    .totalCoverage(totalCoverage)
                    .totalSurplus(totalSurplus)
                    .build();
        }).collect(Collectors.toList());
    }

    private BigDecimal nvl(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private String pdfAmt(BigDecimal amount, String currency) {
        String val = (amount != null ? amount.setScale(2, RoundingMode.HALF_UP).toPlainString() : "0.00");
        return val + " " + (currency != null ? currency : "$");
    }

    private java.awt.Color parseHexColor(String hex, java.awt.Color fallback) {
        if (hex == null || hex.isBlank()) return fallback;
        try {
            String h = hex.startsWith("#") ? hex.substring(1) : hex;
            int r = Integer.parseInt(h.substring(0, 2), 16);
            int g = Integer.parseInt(h.substring(2, 4), 16);
            int b = Integer.parseInt(h.substring(4, 6), 16);
            return new java.awt.Color(r, g, b);
        } catch (Exception e) {
            return fallback;
        }
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
