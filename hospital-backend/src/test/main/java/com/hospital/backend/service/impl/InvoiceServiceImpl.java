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
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final PatientRepository patientRepository;

    // --- LOGIQUE DE RÉSOLUTION D'IDENTITÉ ---

    /**
     * Résout l'email réel du patient.
     * Si emailOrUsername est un nom d'utilisateur (ex: "kakule"),
     * on cherche l'email correspondant en base.
     */
    private String resolveActualEmail(String emailOrUsername) {
        if (emailOrUsername == null) return null;

        // Si c'est déjà un email, on le retourne directement
        if (emailOrUsername.contains("@")) {
            return emailOrUsername;
        }

        return patientRepository.findByEmailOrUsername(emailOrUsername)
                .map(Patient::getEmail)
                .orElse(emailOrUsername);
    }

    // --- DASHBOARD PATIENT ---

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
        BigDecimal totalPaid = invoiceRepository.sumTotalPaidByPatientEmail(actualEmail);
        BigDecimal totalPending = invoiceRepository.sumPendingAmountByPatientEmail(actualEmail);

        return PatientDashboardStatsDTO.builder()
                .totalInvoiced(totalInvoiced != null ? totalInvoiced : BigDecimal.ZERO)
                .totalPaid(totalPaid != null ? totalPaid : BigDecimal.ZERO)
                .totalPending(totalPending != null ? totalPending : BigDecimal.ZERO)
                .build();
    }

    // --- GÉNÉRATION PDF ---

    @Override
    public void exportToPDF(InvoiceDTO dto, OutputStream outputStream) throws IOException {
        Document document = new Document(PageSize.A4);
        try {
            PdfWriter.getInstance(document, outputStream);
            document.open();

            Font fontTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font fontBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font fontNormal = FontFactory.getFont(FontFactory.HELVETICA, 10);

            Paragraph title = new Paragraph("FACTURE MÉDICALE", fontTitle);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Référence : " + dto.getInvoiceCode(), fontBold));
            document.add(new Paragraph("Patient : " + dto.getPatientName(), fontNormal));
            document.add(new Paragraph("Date d'émission : " + (dto.getCreatedAt() != null ? dto.getCreatedAt().toString() : "N/A"), fontNormal));
            document.add(new Paragraph("Statut : " + dto.getStatus(), fontNormal));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(3);
            table.setWidthPercentage(100);
            table.addCell(new Phrase("Description", fontBold));
            table.addCell(new Phrase("Quantité", fontBold));
            table.addCell(new Phrase("Total ($)", fontBold));

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

            Paragraph totalParagraph = new Paragraph("\nTOTAL À PAYER : " + dto.getTotalAmount() + " $", fontTitle);
            totalParagraph.setAlignment(Element.ALIGN_RIGHT);
            document.add(totalParagraph);

        } catch (DocumentException e) {
            log.error("Erreur lors de la création du document PDF", e);
            throw new IOException("Erreur iText: " + e.getMessage());
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    // --- RÉCUPÉRATION ET CALCULS ---

    @Override public InvoiceDTO getById(Long id) { return invoiceRepository.findById(id).map(this::mapToDTO).orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée")); }
    @Override public InvoiceDTO getByCode(String code) { return invoiceRepository.findByInvoiceCode(code).map(this::mapToDTO).orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée")); }
    @Override public PageResponse<InvoiceDTO> getAll(Pageable pageable) { return toPageResponse(invoiceRepository.findAll(pageable)); }
    @Override public PageResponse<InvoiceDTO> getByPatient(Long patientId, Pageable pageable) { return toPageResponse(invoiceRepository.findByPatientId(patientId, pageable)); }
    @Override public PageResponse<InvoiceDTO> getByStatus(InvoiceStatus status, Pageable pageable) { return toPageResponse(invoiceRepository.findByStatus(status, pageable)); }

    @Override public BigDecimal calculateRevenue(LocalDateTime s, LocalDateTime e) {
        BigDecimal revenue = invoiceRepository.calculateRevenueByDateRange(s, e);
        return revenue != null ? revenue : BigDecimal.ZERO;
    }

    @Override public BigDecimal getTotalPending() {
        BigDecimal p = invoiceRepository.calculateTotalPending();
        return p != null ? p : BigDecimal.ZERO;
    }

    @Override @Transactional public void delete(Long id) { invoiceRepository.deleteById(id); }

    // --- MAPPING ---

    private InvoiceDTO mapToDTO(Invoice i) {
        List<InvoiceItemDTO> itemDTOs = (i.getItems() != null) ?
                i.getItems().stream().map(this::mapItemToDTO).collect(Collectors.toList()) : null;

        return InvoiceDTO.builder()
                .id(i.getId())
                .invoiceCode(i.getInvoiceCode())
                .patientId(i.getPatient() != null ? i.getPatient().getId() : null)
                .patientName(i.getPatient() != null ? i.getPatient().getFirstName() + " " + i.getPatient().getLastName() : "Inconnu")
                .items(itemDTOs)
                .totalAmount(i.getTotalAmount())
                .status(i.getStatus())
                .createdAt(i.getCreatedAt())
                .notes(i.getNotes())
                .build();
    }

    private InvoiceItemDTO mapItemToDTO(InvoiceItem item) {
        return InvoiceItemDTO.builder().id(item.getId()).description(item.getDescription()).quantity(item.getQuantity()).totalPrice(item.getTotalPrice()).build();
    }

    private PageResponse<InvoiceDTO> toPageResponse(Page<Invoice> page) {
        return PageResponse.<InvoiceDTO>builder()
                .content(page.getContent().stream().map(this::mapToDTO).collect(Collectors.toList()))
                .page(page.getNumber()).size(page.getSize()).totalElements(page.getTotalElements()).totalPages(page.getTotalPages()).build();
    }

    @Override public InvoiceDTO create(InvoiceDTO d) { return null; }
    @Override public InvoiceDTO update(Long id, InvoiceDTO d) { return null; }
    @Override public InvoiceDTO processPayment(Long id, BigDecimal a, PaymentMethod m) { return null; }
    @Override public InvoiceDTO cancelInvoice(Long id) { return null; }
}