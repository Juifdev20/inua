package com.hospital.backend.service.impl;

import com.hospital.backend.dto.InvoiceDTO;
import com.hospital.backend.dto.InvoiceItemDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.dto.PatientDashboardStatsDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.CompanyConsumptionService;
import com.hospital.backend.service.ConsultationService;
import com.hospital.backend.service.InvoiceService;
import com.hospital.backend.security.HospitalTenantContext;
import com.hospital.backend.service.NotificationService;
import com.hospital.backend.service.PatientDocumentService;
import com.hospital.backend.service.RevenueService;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final PatientRepository patientRepository;
    private final ConsultationRepository consultationRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicationRepository medicationRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final HospitalConfigRepository hospitalConfigRepository;
    // ★ AJOUTÉ : Pour créer la facture/consulter les détails du médecin si nécessaire
    private final UserRepository userRepository;
    
    // ★ AJOUTÉ : Pour créer automatiquement les entrées de revenus
    private final RevenueService revenueService;
    // ★ AJOUTÉ : Pour envoyer des notifications au patient sur les factures et paiements
    private final NotificationService notificationService;
    // ★ AJOUTÉ : Pour enregistrer la consommation des entreprises abonnées
    private final CompanyConsumptionService companyConsumptionService;
    // ★ AJOUTÉ : Pour la génération automatique du dossier patient après paiement
    private final ConsultationService consultationService;
    private final PatientDocumentService patientDocumentService;

    // ── LOGIQUE DE RÉSOLUTION D'IDENTITÉ ─────────────────────────────

    private String resolveActualEmail(String emailOrUsername) {
        if (emailOrUsername == null) return null;
        if (emailOrUsername.contains("@")) return emailOrUsername;
        return patientRepository.findByEmailOrUsername(emailOrUsername)
                .map(Patient::getEmail)
                .orElse(emailOrUsername);
    }

    // ── DASHBOARD PATIENT ─────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InvoiceDTO> getInvoicesByPatientEmail(String emailOrUsername, Pageable pageable) {
        String actualEmail = resolveActualEmail(emailOrUsername);
        log.info("Récupération des factures pour l'email résolu: {}", actualEmail);
        Page<Invoice> page = invoiceRepository.findByPatientEmailOrderByCreatedAtDesc(actualEmail, pageable);
        return toPageResponse(page);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientDashboardStatsDTO getPatientDashboardStats(String emailOrUsername) {
        String actualEmail = resolveActualEmail(emailOrUsername);
        log.info("Calcul des statistiques dashboard pour l'email résolu: {}", actualEmail);
        BigDecimal totalInvoiced = invoiceRepository.sumTotalInvoicedByPatientEmail(actualEmail);
        BigDecimal totalPaid     = invoiceRepository.sumTotalPaidByPatientEmail(actualEmail);
        BigDecimal totalPending  = invoiceRepository.sumPendingAmountByPatientEmail(actualEmail);
        return PatientDashboardStatsDTO.builder()
                .totalInvoiced(totalInvoiced != null ? totalInvoiced : BigDecimal.ZERO)
                .totalPaid(totalPaid         != null ? totalPaid     : BigDecimal.ZERO)
                .totalPending(totalPending   != null ? totalPending  : BigDecimal.ZERO)
                .build();
    }

    // ── GÉNÉRATION PDF ────────────────────────────────────────────────

    @Override
    public void exportToPDF(InvoiceDTO dto, OutputStream outputStream) throws IOException {
        Document document = new Document(PageSize.A4);
        try {
            PdfWriter.getInstance(document, outputStream);
            document.open();

            // Récupérer la configuration de l'hôpital
            HospitalConfig config = hospitalConfigRepository.findFirstByOrderByIdAsc().orElse(null);
            boolean logoEnabled = config != null && (config.getEnableLogoOnDocuments() == null || Boolean.TRUE.equals(config.getEnableLogoOnDocuments()));
            String hospitalName = config != null && config.getHospitalName() != null ? config.getHospitalName() : "INUA AFYA";
            String hospitalLogoUrl = config != null && config.getHospitalLogoUrl() != null ? config.getHospitalLogoUrl() : "";
            String ministryName = config != null && config.getMinistryName() != null ? config.getMinistryName() : "";
            String departmentName = config != null && config.getDepartmentName() != null ? config.getDepartmentName() : "";
            String address = config != null && config.getAddress() != null ? config.getAddress() : "";
            String phoneNumber = config != null && config.getPhoneNumber() != null ? config.getPhoneNumber() : "";
            String email = config != null && config.getEmail() != null ? config.getEmail() : "";
            String footerText = config != null && config.getFooterText() != null ? config.getFooterText() : ("Document généré par " + hospitalName);

            // ── EN-TÊTE AVEC CONFIG ─────────────────────────────────────────
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{1, 3});

            // Logo
            if (logoEnabled && !hospitalLogoUrl.isEmpty()) {
                try {
                    com.lowagie.text.Image logo;
                    if (hospitalLogoUrl.startsWith("data:")) {
                        String base64 = hospitalLogoUrl.substring(hospitalLogoUrl.indexOf(",") + 1);
                        logo = com.lowagie.text.Image.getInstance(java.util.Base64.getDecoder().decode(base64));
                    } else {
                        logo = com.lowagie.text.Image.getInstance(hospitalLogoUrl);
                    }
                    logo.scaleToFit(60, 60);
                    PdfPCell logoCell = new PdfPCell(logo);
                    logoCell.setBorder(Rectangle.NO_BORDER);
                    logoCell.setVerticalAlignment(Element.ALIGN_TOP);
                    headerTable.addCell(logoCell);
                } catch (Exception e) {
                    log.warn("⚠️ Impossible de charger le logo: {}", e.getMessage());
                    PdfPCell emptyCell = new PdfPCell();
                    emptyCell.setBorder(Rectangle.NO_BORDER);
                    headerTable.addCell(emptyCell);
                }
            } else {
                PdfPCell emptyCell = new PdfPCell();
                emptyCell.setBorder(Rectangle.NO_BORDER);
                headerTable.addCell(emptyCell);
            }

            // Infos hôpital
            PdfPCell infoCell = new PdfPCell();
            infoCell.setBorder(Rectangle.NO_BORDER);
            infoCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

            Font hospitalFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

            infoCell.addElement(new Paragraph(hospitalName.toUpperCase(), hospitalFont));
            if (!ministryName.isEmpty()) {
                infoCell.addElement(new Paragraph(ministryName, subFont));
            }
            if (!departmentName.isEmpty()) {
                infoCell.addElement(new Paragraph(departmentName, subFont));
            }
            if (!address.isEmpty()) {
                infoCell.addElement(new Paragraph("📍 " + address, subFont));
            }
            if (!phoneNumber.isEmpty()) {
                infoCell.addElement(new Paragraph("📞 " + phoneNumber, subFont));
            }
            if (!email.isEmpty()) {
                infoCell.addElement(new Paragraph("✉️ " + email, subFont));
            }
            headerTable.addCell(infoCell);

            document.add(headerTable);
            document.add(new Paragraph(" "));

            // Ligne séparatrice
            PdfPTable lineTable = new PdfPTable(1);
            lineTable.setWidthPercentage(100);
            PdfPCell lineCell = new PdfPCell();
            lineCell.setBorder(Rectangle.BOTTOM);
            lineCell.setBorderWidth(1);
            lineCell.setPadding(2);
            lineTable.addCell(lineCell);
            document.add(lineTable);
            document.add(new Paragraph(" "));

            Font fontTitle  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font fontBold   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font fontNormal = FontFactory.getFont(FontFactory.HELVETICA, 10);

            Paragraph title = new Paragraph("FACTURE MÉDICALE", fontTitle);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Référence : " + dto.getInvoiceCode(), fontBold));
            document.add(new Paragraph("Patient : " + dto.getPatientName(), fontNormal));
            document.add(new Paragraph("Date d'émission : " +
                    (dto.getCreatedAt() != null ? dto.getCreatedAt().toString() : "N/A"), fontNormal));
            document.add(new Paragraph("Statut : " + dto.getStatus(), fontNormal));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(3);
            table.setWidthPercentage(100);
            table.addCell(new Phrase("Description", fontBold));
            table.addCell(new Phrase("Quantité",    fontBold));
            table.addCell(new Phrase("Total (CDF)", fontBold));

            if (dto.getItems() != null && !dto.getItems().isEmpty()) {
                for (InvoiceItemDTO item : dto.getItems()) {
                    table.addCell(new Phrase(item.getDescription(), fontNormal));
                    table.addCell(new Phrase(String.valueOf(item.getQuantity()), fontNormal));
                    table.addCell(new Phrase(item.getTotalPrice().toString(), fontNormal));
                }
            } else {
                table.addCell(new Phrase("Services médicaux", fontNormal));
                table.addCell(new Phrase("1", fontNormal));
                table.addCell(new Phrase(dto.getTotalAmount().toString(), fontNormal));
            }

            document.add(table);

            Paragraph totalParagraph = new Paragraph(
                    "\nTOTAL À PAYER : " + dto.getTotalAmount() + " CDF", fontTitle);
            totalParagraph.setAlignment(Element.ALIGN_RIGHT);
            document.add(totalParagraph);

            // Pied de page
            document.add(new Paragraph(" "));
            Paragraph footer = new Paragraph(footerText, FontFactory.getFont(FontFactory.HELVETICA, 9, Font.ITALIC));
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

        } catch (DocumentException e) {
            log.error("Erreur lors de la création du document PDF", e);
            throw new IOException("Erreur iText: " + e.getMessage());
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    // ── RÉCUPÉRATION ET CALCULS ───────────────────────────────────────

    @Override public InvoiceDTO getById(Long id) {
        return invoiceRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée"));
    }

    @Override public InvoiceDTO getByCode(String code) {
        return invoiceRepository.findByInvoiceCode(code)
                .map(this::mapToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée"));
    }

    @Override public PageResponse<InvoiceDTO> getAll(Pageable p)                      { return toPageResponse(invoiceRepository.findAll(p)); }
    @Override public PageResponse<InvoiceDTO> getByPatient(Long id, Pageable p)       { return toPageResponse(invoiceRepository.findByPatientId(id, p)); }
    @Override public PageResponse<InvoiceDTO> getByStatus(InvoiceStatus s, Pageable p){ return toPageResponse(invoiceRepository.findByStatus(s, p)); }

    @Override public BigDecimal calculateRevenue(LocalDateTime s, LocalDateTime e) {
        BigDecimal r = invoiceRepository.calculateRevenueByDateRange(s, e);
        return r != null ? r : BigDecimal.ZERO;
    }

    @Override public BigDecimal getTotalPending() {
        BigDecimal p = invoiceRepository.calculateTotalPending();
        return p != null ? p : BigDecimal.ZERO;
    }

    @Override @Transactional public void delete(Long id) { invoiceRepository.deleteById(id); }

    @Override public InvoiceDTO create(InvoiceDTO d)                                  { return null; }
    @Override public InvoiceDTO update(Long id, InvoiceDTO d)                         { return null; }
    @Override public InvoiceDTO processPayment(Long id, BigDecimal a, PaymentMethod m){ return null; }
    @Override public InvoiceDTO cancelInvoice(Long id)                                { return null; }

    // ── MAPPING ───────────────────────────────────────────────────────

    private InvoiceDTO mapToDTO(Invoice i) {
        List<InvoiceItemDTO> itemDTOs = (i.getItems() != null)
                ? i.getItems().stream().map(this::mapItemToDTO).collect(Collectors.toList())
                : null;

        // ✅ Récupérer les informations d'abonnement depuis l'admission
        Boolean isAbonne = false;
        String companyName = null;
        BigDecimal coverageRate = null;

        if (i.getPrescription() != null && i.getPrescription().getConsultation() != null) {
            Admission admission = i.getPrescription().getConsultation().getAdmission();
            if (admission != null) {
                isAbonne = admission.getIsAbonne() != null ? admission.getIsAbonne() : false;
                if (admission.getCompany() != null) {
                    companyName = admission.getCompany().getName();
                }
                coverageRate = admission.getCoverageRate();
            }
        }

        return InvoiceDTO.builder()
                .id(i.getId())
                .invoiceCode(i.getInvoiceCode())
                .patientId(i.getPatient() != null ? i.getPatient().getId() : null)
                .patientName(i.getPatient() != null
                        ? i.getPatient().getFirstName() + " " + i.getPatient().getLastName()
                        : "Inconnu")
                .consultationId(i.getConsultation() != null ? i.getConsultation().getId() : null)
                .items(itemDTOs)
                .subtotal(i.getSubtotal())
                .taxAmount(i.getTaxAmount())
                .discountAmount(i.getDiscountAmount())
                .totalAmount(i.getTotalAmount())
                .paidAmount(i.getPaidAmount())
                .status(i.getStatus())
                .paymentMethod(i.getPaymentMethod())
                .notes(i.getNotes())
                .createdById(i.getCreatedBy() != null ? i.getCreatedBy().getId() : null)
                .createdByName(i.getCreatedBy() != null ? i.getCreatedBy().getUsername() : null)
                .paidAt(i.getPaidAt())
                .createdAt(i.getCreatedAt())
                .updatedAt(i.getUpdatedAt())
                .departmentSource(i.getDepartmentSource())
                .currency(i.getCurrency())  // ✅ Mapper la devise
                .isAbonne(isAbonne)  // ✅ Mapper l'abonnement
                .companyName(companyName)  // ✅ Mapper le nom de l'entreprise
                .coverageRate(coverageRate)  // ✅ Mapper le taux de couverture
                .build();
    }

    private InvoiceItemDTO mapItemToDTO(InvoiceItem item) {
        return InvoiceItemDTO.builder()
                .id(item.getId())
                .description(item.getDescription())
                .itemType(item.getItemType())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .build();
    }

    private PageResponse<InvoiceDTO> toPageResponse(Page<Invoice> page) {
        return PageResponse.<InvoiceDTO>builder()
                .content(page.getContent().stream().map(this::mapToDTO).collect(Collectors.toList()))
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }

    // ── WORKFLOW PARCOURS PATIENT ─────────────────────────────────────

    @Override
    @Transactional
    public InvoiceDTO createAdmissionInvoice(Long patientId, Long consultationId,
                                             BigDecimal ficheAmount, BigDecimal consulAmount,
                                             String serviceName, Object createdBy) {

        log.info("🏥 Création facture d'admission - Patient: {}, Consultation: {}", patientId, consultationId);

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient non trouvé: " + patientId));

        Consultation consultation = null;
        if (consultationId != null) {
            consultation = consultationRepository.findById(consultationId).orElse(null);
        }

        Invoice invoice = Invoice.builder()
                .invoiceCode("INV-" + System.currentTimeMillis())
                .patient(patient)
                .consultation(consultation)
                .status(InvoiceStatus.EN_ATTENTE)
                .departmentSource(DepartmentSource.RECEPTION)
                .build();

        List<InvoiceItem> items = new ArrayList<>();

        if (ficheAmount != null && ficheAmount.compareTo(BigDecimal.ZERO) > 0) {
            items.add(InvoiceItem.builder()
                    .invoice(invoice)
                    .description("Frais de dossier patient")
                    .itemType(InvoiceItemType.FICHE)
                    .quantity(1)
                    .unitPrice(ficheAmount)
                    .totalPrice(ficheAmount)
                    .build());
        }

        if (consulAmount != null && consulAmount.compareTo(BigDecimal.ZERO) > 0) {
            String desc = serviceName != null ? serviceName : "Consultation médicale";
            items.add(InvoiceItem.builder()
                    .invoice(invoice)
                    .description(desc)
                    .itemType(InvoiceItemType.CONSULTATION)
                    .quantity(1)
                    .unitPrice(consulAmount)
                    .totalPrice(consulAmount)
                    .build());
        }

        BigDecimal total = ficheAmount.add(consulAmount);
        invoice.setItems(items);
        invoice.setTotalAmount(total);
        invoice.setSubtotal(total);
        invoice.setPaidAmount(BigDecimal.ZERO);

        invoice = invoiceRepository.save(invoice);

        if (consultation != null) {
            consultation.setInvoice(invoice);
            // IMPORTANT : On ne met PAS le statut à PAYEE ici, on laisse le controller le faire après paiement réel
            consultationRepository.save(consultation);
        }

        log.info("✅ Facture d'admission créée - ID: {}, Montant: {}", invoice.getId(), total);
        return mapToDTO(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculateDailyRevenue(LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end   = date.atTime(LocalTime.MAX);
        BigDecimal revenue  = invoiceRepository.calculateRevenueByDateRange(start, end);
        return revenue != null ? revenue : BigDecimal.ZERO;
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceDTO> getPendingInvoices() {
        // Utilisation de EN_ATTENTE, comme défini dans les statuts
        return invoiceRepository
                .findByStatus(InvoiceStatus.EN_ATTENTE, Pageable.ofSize(100))
                .getContent()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public InvoiceDTO processPaymentAndNotify(Long invoiceId, PaymentMethod paymentMethod) {
        log.info("💰 Paiement facture: {} - Méthode: {}", invoiceId, paymentMethod);

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée: " + invoiceId));

        // ★ Gestion spéciale pour les prescriptions de pharmacie
        if (invoice.getDepartmentSource() == DepartmentSource.PHARMACY && invoice.getPrescription() != null) {
            log.info("💊 Facture pharmacie détectée - Traitement spécial avec mise à jour du stock");
            return processPharmacyPayment(invoice, paymentMethod);
        }

        // 1. Mise à jour du statut de la facture vers PAYEE
        invoice.setStatus(InvoiceStatus.PAYEE);
        invoice.setPaymentMethod(paymentMethod);
        invoice.setPaidAmount(invoice.getTotalAmount());
        invoice.setPaidAt(LocalDateTime.now());
        invoice = invoiceRepository.save(invoice);

        // 2. CORRECTION : Mise à jour de la consultation liée pour débloquer le médecin
        log.info("🔍 [DEBUG] Vérification consultation liée - invoice.getConsultation(): {}", invoice.getConsultation());
        if (invoice.getConsultation() != null) {
            Consultation consultation = invoice.getConsultation();
            log.info("🔍 [DEBUG] Consultation trouvée ID: {}, Statut actuel: {}", consultation.getId(), consultation.getStatus());
            consultation.setStatus(ConsultationStatus.PAYEE);
            // ✅ Synchroniser ficheAmountPaid / consulAmountPaid pour que le dossier affiche 0 crédit
            try {
                Double ficheDue = consultation.getFicheAmountDue();
                Double consulDue = consultation.getConsulAmountDue();
                if (ficheDue != null && ficheDue > 0 && (consultation.getFicheAmountPaid() == null || consultation.getFicheAmountPaid() == 0)) {
                    consultation.setFicheAmountPaid(ficheDue);
                }
                if (consulDue != null && consulDue > 0 && (consultation.getConsulAmountPaid() == null || consultation.getConsulAmountPaid() == 0)) {
                    consultation.setConsulAmountPaid(consulDue);
                }
            } catch (Exception e) {
                log.warn("⚠️ Erreur mise à jour montants payés consultation: {}", e.getMessage());
            }
            consultationRepository.save(consultation);
            log.info("✅ Consultation liée {} passée au statut PAYEE (ficheAmountPaid mis à jour)", consultation.getId());
        } else {
            log.warn("⚠️ [DEBUG] Aucune consultation liée à la facture {}", invoiceId);
        }

        if (invoice.getDepartmentSource() != null) {
            log.info("📢 Notification → département: {}", invoice.getDepartmentSource());
            // notificationService.sendNotification(invoice.getDepartmentSource(), ...);
        }

        // ★ CRÉATION AUTOMATIQUE DU REVENU ENCAISSÉ
        try {
            Long userId = invoice.getCreatedBy() != null ? invoice.getCreatedBy().getId() : null;
            if (userId != null) {
                revenueService.createRevenueFromInvoice(invoiceId, userId);
                log.info("💰✅ Revenu auto-créé pour la facture: {}", invoiceId);
            } else {
                log.warn("⚠️ Impossible de créer le revenu - Utilisateur inconnu pour la facture: {}", invoiceId);
            }
        } catch (Exception e) {
            log.error("❌ Erreur lors de la création auto du revenu pour facture {}: {}", invoiceId, e.getMessage());
            // Ne pas bloquer le paiement si la création de revenu échoue
        }

        // ★ NOTIFICATION AU PATIENT - Confirmation de paiement
        try {
            if (invoice.getPatient() != null && invoice.getPatient().getUser() != null) {
                String title = "Paiement confirmé ✅";
                String message = String.format("Votre facture %s de %s %s a été payée avec succès.",
                        invoice.getInvoiceCode(),
                        invoice.getTotalAmount(),
                        invoice.getCurrency() != null ? invoice.getCurrency().name() : "CDF");
                
                notificationService.createAndSend(
                        invoice.getPatient().getUser(),
                        title,
                        message,
                        NotificationType.PAIEMENT,
                        invoice.getId()
                );
                log.info("📢 Notification de paiement envoyée au patient {}", invoice.getPatient().getId());
            }
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi de la notification de paiement: {}", e.getMessage());
            // Ne pas bloquer le paiement si la notification échoue
        }

        log.info("✅ Paiement traité - Facture: {}, Statut: PAYEE", invoiceId);
        return mapToDTO(invoice);
    }

    /**
     * Traite le paiement d'une facture de pharmacie avec validation et mise à jour du stock
     * ★ ROBUSTESSE: Protection double paiement, logging mouvements, rollback auto
     */
    private InvoiceDTO processPharmacyPayment(Invoice invoice, PaymentMethod paymentMethod) {
        Long invoiceId = invoice.getId();
        log.info("💊 Traitement paiement pharmacie pour facture: {}", invoiceId);
        
        // ★ ROBUSTESSE 1: Protection contre les doubles paiements (idempotence)
        if (invoice.getStatus() == InvoiceStatus.PAYEE) {
            log.warn("⚠️ Facture {} déjà payée - Paiement ignoré (idempotence)", invoiceId);
            return mapToDTO(invoice);
        }
        
        Prescription prescription = invoice.getPrescription();
        List<PrescriptionItem> items = prescriptionItemRepository.findByPrescriptionId(prescription.getId());
        
        // ★ ROBUSTESSE 2: Vérification du stock AVANT toute modification
        log.info("🔍 Vérification stock pour {} médicaments", items.size());
        for (PrescriptionItem item : items) {
            Medication medication = item.getMedication();
            Integer requiredQuantity = item.getQuantity() != null ? item.getQuantity() : 0;
            Integer availableStock = medication.getStockQuantity() != null ? medication.getStockQuantity() : 0;
            
            log.info("📦 {}: Requis={}, Stock={}", medication.getName(), requiredQuantity, availableStock);
            
            if (requiredQuantity > availableStock) {
                log.error("❌ Stock insuffisant pour {} (Requis: {}, Disponible: {})", 
                    medication.getName(), requiredQuantity, availableStock);
                throw new RuntimeException("Stock insuffisant pour le médicament: " + medication.getName() + 
                    " (Requis: " + requiredQuantity + ", Disponible: " + availableStock + ")");
            }
        }
        
        // Liste pour le rollback en cas d'erreur
        List<StockMovement> movements = new ArrayList<>();
        
        try {
            // 1. Mise à jour du stock avec logging
            log.info("📉 Mise à jour du stock et création des mouvements...");
            for (PrescriptionItem item : items) {
                Medication medication = item.getMedication();
                Integer requiredQuantity = item.getQuantity() != null ? item.getQuantity() : 0;
                Integer currentStock = medication.getStockQuantity() != null ? medication.getStockQuantity() : 0;
                Integer newStock = currentStock - requiredQuantity;
                
                // Mettre à jour le stock
                medication.setStockQuantity(newStock);
                medicationRepository.save(medication);
                
                // ★ ROBUSTESSE 3: Logger le mouvement de stock
                StockMovement movement = StockMovement.builder()
                    .medication(medication)
                    .quantityChange(-requiredQuantity)  // Négatif car sortie
                    .previousStock(currentStock)
                    .newStock(newStock)
                    .movementType(StockMovement.MovementType.SORTIE_PRESCRIPTION)
                    .referenceId(invoiceId)
                    .referenceType("INVOICE_PRESCRIPTION")
                    .notes("Vente prescription " + prescription.getPrescriptionCode())
                    .build();
                stockMovementRepository.save(movement);
                movements.add(movement);
                
                log.info("✅ Stock mis à jour pour {}: {} → {} (Mouvement ID: {})", 
                    medication.getName(), currentStock, newStock, movement.getId());
            }
            
            // 2. Mise à jour de la facture
            invoice.setStatus(InvoiceStatus.PAYEE);
            invoice.setPaymentMethod(paymentMethod);
            invoice.setPaidAmount(invoice.getTotalAmount());
            invoice.setPaidAt(LocalDateTime.now());
            invoice = invoiceRepository.save(invoice);
            log.info("✅ Facture {} marquée comme PAYEE", invoice.getInvoiceCode());
            
            // 3. Mise à jour du statut de la prescription à PAYEE
            prescription.setStatus(PrescriptionStatus.PAYEE);
            prescriptionRepository.save(prescription);
            log.info("✅ Prescription {} mise à jour au statut PAYEE", prescription.getPrescriptionCode());
            
            // 4. Mise à jour de la consultation liée
            if (invoice.getConsultation() != null) {
                Consultation consultation = invoice.getConsultation();
                consultation.setStatus(ConsultationStatus.PAYEE);
                consultationRepository.save(consultation);
                log.info("✅ Consultation liée {} passée au statut PAYEE", consultation.getId());
            }
            
            // ★ CRÉATION AUTOMATIQUE DU REVENU POUR PHARMACIE
            try {
                Long userId = invoice.getCreatedBy() != null ? invoice.getCreatedBy().getId() : null;
                if (userId != null) {
                    revenueService.createRevenueFromInvoice(invoiceId, userId);
                    log.info("💰✅ Revenu pharmacie auto-créé pour la facture: {}", invoiceId);
                } else {
                    log.warn("⚠️ Impossible de créer le revenu pharmacie - Utilisateur inconnu pour la facture: {}", invoiceId);
                }
            } catch (Exception e) {
                log.error("❌ Erreur lors de la création auto du revenu pharmacie pour facture {}: {}", invoiceId, e.getMessage());
            }
            
            log.info("💰✅ Paiement pharmacie traité avec succès - Facture: {}, Prescription: {} PAYEE, {} mouvements de stock créés", 
                invoice.getInvoiceCode(), prescription.getPrescriptionCode(), movements.size());
            return mapToDTO(invoice);
            
        } catch (Exception e) {
            // ★ ROBUSTESSE 4: Rollback automatique en cas d'erreur
            log.error("❌ Erreur lors du traitement du paiement. Lancement du rollback...", e);
            rollbackStockMovements(items, movements, invoiceId);
            throw new RuntimeException("Erreur lors du traitement du paiement: " + e.getMessage(), e);
        }
    }

    /**
     * ★ ROBUSTESSE: Rollback automatique des mouvements de stock en cas d'erreur
     */
    private void rollbackStockMovements(List<PrescriptionItem> items, List<StockMovement> movements, Long invoiceId) {
        log.warn("🔄 ROLLBACK: Restauration du stock pour la facture {}", invoiceId);
        
        try {
            // Remettre le stock en place pour les médicaments déjà modifiés
            for (int i = 0; i < items.size(); i++) {
                PrescriptionItem item = items.get(i);
                
                // Vérifier si un mouvement a été créé pour cet item
                if (i < movements.size()) {
                    StockMovement movement = movements.get(i);
                    Medication medication = item.getMedication();
                    
                    // Restaurer le stock précédent
                    Integer previousStock = movement.getPreviousStock();
                    medication.setStockQuantity(previousStock);
                    medicationRepository.save(medication);
                    
                    // Créer un mouvement d'annulation
                    StockMovement rollbackMovement = StockMovement.builder()
                        .medication(medication)
                        .quantityChange(movement.getQuantityChange() * -1)  // Inverse
                        .previousStock(movement.getNewStock())
                        .newStock(previousStock)
                        .movementType(StockMovement.MovementType.ANNULATION)
                        .referenceId(invoiceId)
                        .referenceType("INVOICE_PRESCRIPTION_ROLLBACK")
                        .notes("Rollback suite à erreur de paiement")
                        .build();
                    stockMovementRepository.save(rollbackMovement);
                    
                    log.info("🔄 ROLLBACK: Stock restauré pour {}: {} → {}", 
                        medication.getName(), movement.getNewStock(), previousStock);
                }
            }
            log.info("✅ ROLLBACK terminé pour la facture {}", invoiceId);
        } catch (Exception rollbackError) {
            log.error("💥 ERREUR CRITIQUE: Le rollback a échoué! Stock potentiellement incohérent.", rollbackError);
        }
    }

    // ── ★ NOUVEAU ─────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceDTO> getPendingInvoicesByDepartment(DepartmentSource source) {
        log.info("📋 File d'attente département: {}", source);

        List<Invoice> invoices = invoiceRepository
                .findByStatusAndDepartmentSource(InvoiceStatus.EN_ATTENTE, source);

        log.info("✅ {} facture(s) en attente pour {}", invoices.size(), source);

        return invoices.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getStatsByDepartment(DepartmentSource source) {
        log.info("📊 Stats département: {}", source);

        // Factures en attente
        List<InvoiceDTO> pending = getPendingInvoicesByDepartment(source);
        BigDecimal totalPendingAmount = pending.stream()
                .map(inv -> inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Factures payées (aujourd'hui)
        LocalDateTime todayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime todayEnd = LocalDateTime.now().toLocalDate().atTime(LocalTime.MAX);
        
        Long hId = HospitalTenantContext.getHospitalId();
        List<Invoice> paidInvoices = (hId != null)
                ? invoiceRepository.findByStatusAndDepartmentSourceAndHospitalId(InvoiceStatus.PAYEE, source, hId)
                : invoiceRepository.findByStatusAndDepartmentSource(InvoiceStatus.PAYEE, source);
        
        // Filtrer pour aujourd'hui uniquement
        List<Invoice> paidToday = paidInvoices.stream()
                .filter(inv -> inv.getPaidAt() != null 
                    && !inv.getPaidAt().isBefore(todayStart) 
                    && !inv.getPaidAt().isAfter(todayEnd))
                .collect(Collectors.toList());
        
        BigDecimal totalPaidAmount = paidInvoices.stream()
                .map(inv -> inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal todayPaidAmount = paidToday.stream()
                .map(inv -> inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Déterminer la devise (prendre celle de la première facture en attente, sinon USD)
        String currency = pending.stream()
                .findFirst()
                .map(InvoiceDTO::getCurrency)
                .map(Enum::name)
                .orElse("USD");

        return Map.of(
                "pendingCount",    pending.size(),
                "pendingAmount", totalPendingAmount,
                "paidCount",     paidInvoices.size(),
                "paidAmount",    totalPaidAmount,
                "todayPaidAmount", todayPaidAmount,
                "totalCount",    pending.size() + paidInvoices.size(),
                "totalAmount",   totalPendingAmount.add(totalPaidAmount),
                "currency",      currency
        );
    }

    // ══════════════════════════════════════════════════════════════════
    // ── ★ CONVERSIONS UTILITAIRES
    // ══════════════════════════════════════════════════════════════════

    /**
     * Helper de conversion robuste Number|Double|BigDecimal|String -> BigDecimal
     * Gère les Double venant de vos champs de montant.
     */
    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal) return (BigDecimal) value;
        if (value instanceof Number) {
            // Utilise doubleValue pour couvrir Double, Integer, Long, etc.
            return BigDecimal.valueOf(((Number) value).doubleValue());
        }
        try {
            return new BigDecimal(value.toString());
        } catch (Exception e) {
            log.warn("Impossible de convertir '{}' en BigDecimal pour la facture: {}", value, e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // ── ★ MÉTHODES POUR LE FLUX PHARMACIE PRESCRIPTION
    // ══════════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public InvoiceDTO createPrescriptionInvoice(Long prescriptionId, Object createdBy) {
        log.info("Création de la facture pour la prescription ID: {}", prescriptionId);
        
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
            .orElseThrow(() -> new ResourceNotFoundException("Prescription non trouvée avec ID: " + prescriptionId));
        
        log.info("🔍 [DEBUG] Prescription trouvée: {} - Statut: {}", prescription.getPrescriptionCode(), prescription.getStatus());
        
        // Vérifier si une facture existe déjà pour cette prescription
        if (invoiceRepository.findByPrescriptionId(prescriptionId).isPresent()) {
            throw new RuntimeException("Une facture existe déjà pour cette prescription");
        }
        
        // Vérifier que la prescription a des items
        List<PrescriptionItem> items = prescriptionItemRepository.findByPrescriptionId(prescriptionId);
        log.info("🔍 [DEBUG] Nombre d'items dans la prescription: {}", items.size());
        
        if (items.isEmpty()) {
            throw new RuntimeException("La prescription ne contient aucun médicament");
        }
        
        for (PrescriptionItem item : items) {
            if (item.getMedication() != null) {
                Integer stockRequired = item.getQuantity() != null ? item.getQuantity() : 0;
                Integer stockAvailable = item.getMedication().getStockQuantity() != null ? item.getMedication().getStockQuantity() : 0;
                if (stockRequired > stockAvailable) {
                    throw new RuntimeException("Stock insuffisant pour le médicament: " + item.getMedication().getName() +
                        " (Requis: " + stockRequired + ", Disponible: " + stockAvailable + ")");
                }
            }
        }
        
        // Calculer le total à partir des médicaments
        BigDecimal totalAmount = items.stream()
            .map(item -> {
                if (item.getMedication() == null) {
                    log.warn("⚠️ [DEBUG] Medicament null pour l'item ID: {}", item.getId());
                    return BigDecimal.ZERO;
                }
                
                // Logs détaillés pour le debug
                log.info("🔍 [DEBUG] Item ID: {}", item.getId());
                log.info("🔍 [DEBUG] Médicament: {}", item.getMedication().getName());
                log.info("🔍 [DEBUG] getUnitPrice() brut: {}", item.getMedication().getUnitPrice());
                log.info("🔍 [DEBUG] getPrice() brut: {}", item.getMedication().getPrice());
                log.info("🔍 [DEBUG] SaleCurrency: {}", item.getMedication().getSaleCurrency());  // ✅ LOG DEVISE
                log.info("🔍 [DEBUG] Quantity: {}", item.getQuantity());
                
                // Sécurité : Utiliser unitPrice d'abord, puis price, puis défaut
                BigDecimal unitPrice = item.getMedication().getUnitPrice();
                if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
                    log.warn("⚠️ [DEBUG] unitPrice null ou 0, utilisation de price");
                    unitPrice = item.getMedication().getPrice();
                }
                if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
                    log.warn("⚠️ [DEBUG] price aussi null ou 0, utilisation du défaut 1.0");
                    unitPrice = BigDecimal.valueOf(1.0);
                }
                
                BigDecimal quantity;
                if (item.getQuantity() != null && item.getQuantity() > 0) {
                    quantity = BigDecimal.valueOf(item.getQuantity());
                } else {
                    log.warn("⚠️ [DEBUG] Quantity null ou 0 pour l'item {}, utilisation du défaut 1", item.getId());
                    quantity = BigDecimal.ONE;
                }
                
                BigDecimal itemTotal = unitPrice.multiply(quantity);
                log.info("💰 [DEBUG] Item: {} - Prix unit: {} - Qté: {} - Total: {}", 
                    item.getMedication().getName(), unitPrice, quantity, itemTotal);
                    
                return itemTotal;
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        log.info("💰 [DEBUG] Montant total calculé: {}", totalAmount);
        
        if (totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Le montant total de la facture ne peut pas être zéro ou négatif");
        }
        
        // Utiliser la devise de la prescription (USD par défaut)
        Currency invoiceCurrency = prescription.getCurrency() != null ? prescription.getCurrency() : Currency.USD;

        log.info("💱 [DEBUG] Devise de la prescription: {}", invoiceCurrency);
        log.info("💱 [DEBUG] Devise de la facture déterminée: {}", invoiceCurrency);
        
        // Créer d'abord l'invoice pour obtenir l'ID
        Invoice invoice = Invoice.builder()
            .prescription(prescription)
            .patient(prescription.getPatient())
            .consultation(prescription.getConsultation())
            .totalAmount(totalAmount)
            .subtotal(totalAmount)
            .paidAmount(BigDecimal.ZERO)
            .status(InvoiceStatus.EN_ATTENTE)
            .departmentSource(DepartmentSource.PHARMACY)
            .currency(invoiceCurrency)  // ✅ Stocker la devise d'origine
            .createdBy((User) createdBy)
            .build();
        
        final Invoice savedInvoice = invoiceRepository.save(invoice);
        log.info("✅ Facture créée: {} avec ID: {}", savedInvoice.getInvoiceCode(), savedInvoice.getId());

        // Créer les InvoiceItem maintenant que l'invoice a un ID
        List<InvoiceItem> invoiceItems = items.stream()
            .map(item -> {
                BigDecimal unitPrice = item.getMedication().getUnitPrice();
                if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
                    unitPrice = item.getMedication().getPrice();
                }
                if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
                    unitPrice = BigDecimal.ONE;
                }

                Integer quantity = item.getQuantity() != null ? item.getQuantity() : 1;
                BigDecimal totalPrice = unitPrice.multiply(BigDecimal.valueOf(quantity));

                return InvoiceItem.builder()
                    .invoice(savedInvoice)
                    .description(item.getMedication().getName() + " - " + (item.getDosage() != null ? item.getDosage() : ""))
                    .quantity(quantity)
                    .unitPrice(unitPrice)
                    .totalPrice(totalPrice)
                    .itemType(InvoiceItemType.MEDICAMENT)
                    .build();
            })
            .collect(Collectors.toList());
        
        // Sauvegarder les items
        invoiceItemRepository.saveAll(invoiceItems);
        log.info("✅ {} médicaments ajoutés à la facture {}", invoiceItems.size(), savedInvoice.getInvoiceCode());
        
        // Recharger l'invoice avec les items
        savedInvoice.setItems(invoiceItems);

        return mapToDTO(savedInvoice);
    }

    @Override
    @Transactional
    public InvoiceDTO generateInvoice(Long prescriptionId) {
        log.info("🔧 [GENERATE] Génération automatique de facture pour prescription ID: {}", prescriptionId);
        
        try {
            // Utiliser l'utilisateur système (ID 1) comme créateur
            User systemUser = userRepository.findById(1L)
                .orElseThrow(() -> new RuntimeException("Utilisateur système non trouvé"));
            
            log.info("✅ [DEBUG] Utilisateur système trouvé: {}", systemUser.getUsername());
            
            return createPrescriptionInvoice(prescriptionId, systemUser);
        } catch (Exception e) {
            log.error("❌ [DEBUG] Erreur dans generateInvoice: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur génération facture: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public InvoiceDTO processPrescriptionPayment(Long invoiceId, PaymentMethod paymentMethod) {
        log.info("🔵 [PAYMENT SERVICE] Début traitement paiement - Facture ID: {}, Méthode: {}", invoiceId, paymentMethod);

        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> {
                log.error("❌ [PAYMENT SERVICE] Facture non trouvée - ID: {}", invoiceId);
                return new ResourceNotFoundException("Facture non trouvée");
            });

        log.info("✅ [PAYMENT SERVICE] Facture trouvée - Statut: {}, Prescription: {}",
            invoice.getStatus(), invoice.getPrescription() != null ? invoice.getPrescription().getId() : null);

        if (invoice.getStatus() != InvoiceStatus.EN_ATTENTE) {
            log.error("❌ [PAYMENT SERVICE] Statut incorrect - Attendu: EN_ATTENTE, Actuel: {}", invoice.getStatus());
            throw new RuntimeException("Cette facture n'est pas en attente de paiement. Statut actuel: " + invoice.getStatus());
        }

        if (invoice.getPrescription() == null) {
            log.error("❌ [PAYMENT SERVICE] Facture non liée à une prescription");
            throw new RuntimeException("Cette facture n'est pas liée à une prescription");
        }

        // ★ Vérifier si le patient est abonné et appliquer la couverture entreprise
        Prescription prescription = invoice.getPrescription();
        boolean isAbonne = false;
        com.hospital.backend.entity.Company company = null;
        BigDecimal coverageRate = BigDecimal.ZERO;

        if (prescription.getConsultation() != null && prescription.getConsultation().getAdmission() != null) {
            Admission admission = prescription.getConsultation().getAdmission();
            isAbonne = admission.getIsAbonne() != null ? admission.getIsAbonne() : false;
            company = admission.getCompany();
            coverageRate = admission.getCoverageRate() != null ? admission.getCoverageRate() : BigDecimal.ZERO;

            log.info("💳 [ABONNÉ] Patient abonné: {}, Entreprise: {}, Taux couverture: {}%",
                isAbonne, company != null ? company.getName() : "N/A", coverageRate);
        }

        // ✅ FALLBACK: si isAbonne=false ou admission non chargée, recharger la consultation depuis la BDD
        if (!isAbonne && prescription.getConsultation() != null) {
            try {
                Long consultId = prescription.getConsultation().getId();
                Consultation freshConsult = consultationRepository.findById(consultId).orElse(null);
                if (freshConsult != null && freshConsult.getAdmission() != null) {
                    Admission freshAdm = freshConsult.getAdmission();
                    if (Boolean.TRUE.equals(freshAdm.getIsAbonne()) && freshAdm.getCompany() != null) {
                        isAbonne = true;
                        company = freshAdm.getCompany();
                        coverageRate = freshAdm.getCoverageRate() != null ? freshAdm.getCoverageRate() : new BigDecimal("100");
                        log.info("✅ [ABONNÉ FALLBACK] Statut abonné récupéré via rechargement - Entreprise: {}, Taux: {}%",
                            company.getName(), coverageRate);
                    }
                }
            } catch (Exception e) {
                log.warn("⚠️ [ABONNÉ FALLBACK] Impossible de vérifier le statut abonné: {}", e.getMessage());
            }
        }

        // Si abonné, calculer la couverture et enregistrer la consommation
        if (isAbonne && company != null) {
            BigDecimal totalAmount = invoice.getTotalAmount();
            BigDecimal companyCoverage = totalAmount;
            BigDecimal patientSurplus = BigDecimal.ZERO;

            // Si taux de couverture < 100%, calculer le surplus du patient
            if (coverageRate.compareTo(new BigDecimal("100")) < 0) {
                companyCoverage = totalAmount.multiply(coverageRate)
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                patientSurplus = totalAmount.subtract(companyCoverage);
            }

            log.info("💳 [ABONNÉ] Total: {}, Couverture entreprise: {}, Surplus patient: {}",
                totalAmount, companyCoverage, patientSurplus);

            // Enregistrer la consommation entreprise
            try {
                companyConsumptionService.record(
                    company,
                    prescription.getPatient(),
                    prescription.getConsultation().getAdmission(),
                    com.hospital.backend.entity.CompanyConsumptionRecord.FluxType.PHARMACIE,
                    "Prescription " + prescription.getPrescriptionCode(),
                    totalAmount,
                    coverageRate
                );
                log.info("✅ [ABONNÉ] Consommation pharmacie enregistrée pour l'entreprise");
            } catch (Exception e) {
                log.error("❌ [ABONNÉ] Erreur enregistrement consommation: {}", e.getMessage(), e);
            }

            // Mettre à jour le montant à payer (seulement le surplus si couverture < 100%)
            if (patientSurplus.compareTo(BigDecimal.ZERO) > 0) {
                invoice.setTotalAmount(patientSurplus);
                log.info("💳 [ABONNÉ] Montant facture ajusté au surplus: {}", patientSurplus);
            } else {
                // Couverture 100% - montant à 0
                invoice.setTotalAmount(BigDecimal.ZERO);
                log.info("💳 [ABONNÉ] Couverture 100% - montant facture: 0");
            }
        }
        
        // Vérification du stock pour chaque médicament
        log.info("🔵 [PAYMENT SERVICE] Vérification du stock pour prescription ID: {}", invoice.getPrescription().getId());
        List<PrescriptionItem> items = prescriptionItemRepository.findByPrescriptionId(invoice.getPrescription().getId());
        log.info("✅ [PAYMENT SERVICE] {} médicaments trouvés dans la prescription", items.size());
        
        for (PrescriptionItem item : items) {
            Medication medication = item.getMedication();
            Integer requiredQuantity = item.getQuantity() != null ? item.getQuantity() : 0;
            Integer availableStock = medication.getStockQuantity() != null ? medication.getStockQuantity() : 0;
            
            log.info("🔵 [PAYMENT SERVICE] Stock check - Médicament: {}, Requis: {}, Disponible: {}", 
                medication.getName(), requiredQuantity, availableStock);
            
            if (requiredQuantity > availableStock) {
                log.warn("⚠️ [PAYMENT SERVICE] Stock insuffisant - Médicament: {}, Requis: {}, Disponible: {} - Paiement autorisé, déficit enregistré", 
                    medication.getName(), requiredQuantity, availableStock);
            }
        }
        
        // Mise à jour du stock
        for (PrescriptionItem item : items) {
            Medication medication = item.getMedication();
            Integer requiredQuantity = item.getQuantity() != null ? item.getQuantity() : 0;
            Integer currentStock = medication.getStockQuantity() != null ? medication.getStockQuantity() : 0;
            
            medication.setStockQuantity(Math.max(0, currentStock - requiredQuantity));
            medicationRepository.save(medication);
            
            log.info("Stock mis à jour pour {}: {} -> {}", medication.getName(), currentStock, currentStock - requiredQuantity);
        }
        
        // Mise à jour de la facture
        invoice.setStatus(InvoiceStatus.PAYEE);
        invoice.setPaidAmount(invoice.getTotalAmount());
        invoice.setPaymentMethod(paymentMethod);
        invoice.setPaidAt(LocalDateTime.now());
        
        invoice = invoiceRepository.save(invoice);

        // Mise à jour du statut de la prescription
        prescription.setStatus(PrescriptionStatus.PAYEE);
        prescriptionRepository.save(prescription);
        log.info("✅ Prescription {} marquée comme PAYEE - prête pour retrait pharmacie", prescription.getPrescriptionCode());

        // 🎯 Génération automatique du dossier patient après paiement de la prescription
        try {
            Long consultationId = prescription.getConsultation().getId();
            if (!patientDocumentService.dossierExistsForConsultation(consultationId)) {
                patientDocumentService.generatePatientDossier(consultationId);
                log.info("✅ [DOSSIER] Dossier généré automatiquement pour consultation {}", consultationId);
            } else {
                log.info("📋 [DOSSIER] Dossier déjà existant pour consultation {}", consultationId);
            }
        } catch (Exception e) {
            log.error("❌ [DOSSIER] Erreur génération dossier après paiement prescription: {}", e.getMessage(), e);
        }

        // ★ CRÉATION AUTOMATIQUE DU REVENU POUR PRESCRIPTION (SEULEMENT POUR NON-ABONNÉS)
        try {
            // Créer le revenu SEULEMENT si le patient n'est PAS abonné
            if (!isAbonne) {
                Long userId = invoice.getCreatedBy() != null ? invoice.getCreatedBy().getId() : null;
                if (userId != null) {
                    revenueService.createRevenueFromInvoice(invoice.getId(), userId);
                    log.info("💰✅ Revenu auto-créé pour la prescription facture: {}", invoice.getId());
                } else {
                    log.warn("⚠️ Impossible de créer le revenu prescription - Utilisateur inconnu");
                }
            } else {
                log.info("💳 [ABONNÉ] Pas de création de revenu - Patient abonné (dette entreprise)");
            }
        } catch (Exception e) {
            log.error("❌ Erreur création auto revenu prescription: {}", e.getMessage());
        }
        
        // ★ NOTIFICATION AU PATIENT - Nouvelle facture pharmacie créée
        try {
            if (invoice.getPatient() != null && invoice.getPatient().getUser() != null) {
                String title = "Nouvelle facture en attente ⏳";
                String message = String.format("Votre facture %s de %s %s pour médicaments est prête. Présentez-vous à la caisse.",
                        invoice.getInvoiceCode(),
                        invoice.getTotalAmount(),
                        invoice.getCurrency() != null ? invoice.getCurrency().name() : "CDF");
                
                notificationService.createAndSend(
                        invoice.getPatient().getUser(),
                        title,
                        message,
                        NotificationType.PAIEMENT,
                        invoice.getId()
                );
                log.info("📢 Notification de nouvelle facture envoyée au patient {}", invoice.getPatient().getId());
            }
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi de la notification de nouvelle facture: {}", e.getMessage());
        }
        
        log.info("Paiement traité avec succès pour la facture: {}", invoice.getInvoiceCode());
        
        return mapToDTO(invoice);
    }
}