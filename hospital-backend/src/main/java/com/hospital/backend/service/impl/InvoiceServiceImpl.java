package com.hospital.backend.service.impl;

import com.hospital.backend.dto.InvoiceDTO;
import com.hospital.backend.dto.InvoiceItemDTO;
import com.hospital.backend.dto.PageResponse;
import com.hospital.backend.dto.PatientDashboardStatsDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.InvoiceService;

import com.lowagie.text.*;
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
    // ★ AJOUTÉ : Pour créer la facture/consulter les détails du médecin si nécessaire
    private final UserRepository userRepository;

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
                .build();
    }

    private InvoiceItemDTO mapItemToDTO(InvoiceItem item) {
        return InvoiceItemDTO.builder()
                .id(item.getId())
                .description(item.getDescription())
                .quantity(item.getQuantity())
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
            // On passe le statut à PAYEE pour satisfaire la condition du bouton "Envoyer chez le médecin"
            consultation.setStatus(ConsultationStatus.PAYEE);
            consultationRepository.save(consultation);
            log.info("✅ Consultation liée {} passée au statut PAYEE", consultation.getId());
        } else {
            log.warn("⚠️ [DEBUG] Aucune consultation liée à la facture {}", invoiceId);
        }

        if (invoice.getDepartmentSource() != null) {
            log.info("📢 Notification → département: {}", invoice.getDepartmentSource());
            // notificationService.sendNotification(invoice.getDepartmentSource(), ...);
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

        List<InvoiceDTO> pending = getPendingInvoicesByDepartment(source);

        BigDecimal totalPendingAmount = pending.stream()
                .map(inv -> inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return Map.of(
                "pendingCount",  pending.size(),
                "pendingAmount", totalPendingAmount,
                "currency",      "CDF"
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
        log.info("Traitement du paiement pour la facture ID: {} avec méthode: {}", invoiceId, paymentMethod);
        
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée"));
        
        if (invoice.getStatus() != InvoiceStatus.EN_ATTENTE) {
            throw new RuntimeException("Cette facture n'est pas en attente de paiement");
        }
        
        if (invoice.getPrescription() == null) {
            throw new RuntimeException("Cette facture n'est pas liée à une prescription");
        }
        
        // Vérification du stock pour chaque médicament
        List<PrescriptionItem> items = prescriptionItemRepository.findByPrescriptionId(invoice.getPrescription().getId());
        for (PrescriptionItem item : items) {
            Medication medication = item.getMedication();
            Integer requiredQuantity = item.getQuantity() != null ? item.getQuantity() : 0;
            Integer availableStock = medication.getStockQuantity() != null ? medication.getStockQuantity() : 0;
            
            if (requiredQuantity > availableStock) {
                throw new RuntimeException("Stock insuffisant pour le médicament: " + medication.getName() + 
                    " (Requis: " + requiredQuantity + ", Disponible: " + availableStock + ")");
            }
        }
        
        // Mise à jour du stock
        for (PrescriptionItem item : items) {
            Medication medication = item.getMedication();
            Integer requiredQuantity = item.getQuantity() != null ? item.getQuantity() : 0;
            Integer currentStock = medication.getStockQuantity() != null ? medication.getStockQuantity() : 0;
            
            medication.setStockQuantity(currentStock - requiredQuantity);
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
        Prescription prescription = invoice.getPrescription();
        prescription.setStatus(PrescriptionStatus.PAYEE);
        prescriptionRepository.save(prescription);
        log.info("✅ Prescription {} marquée comme PAYEE - prête pour retrait pharmacie", prescription.getPrescriptionCode());
        
        log.info("Paiement traité avec succès pour la facture: {}", invoice.getInvoiceCode());
        
        return mapToDTO(invoice);
    }
}