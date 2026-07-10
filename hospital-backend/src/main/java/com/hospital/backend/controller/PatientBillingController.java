 package com.hospital.backend.controller;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.*;
import com.hospital.backend.entity.InvoiceItem;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.NotificationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.lowagie.text.*;
import com.lowagie.text.Image;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.net.URL;
import java.util.Base64;
import java.io.ByteArrayInputStream;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTRÔLEUR DE FACTURATION PATIENT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ce contrôleur gère l'historique de facturation complet du patient,
 * incluant les admissions (réception), les ventes pharmacie, et les notifications
 * de paiement en temps réel.
 * 
 * Architecture: REST API v1.0
 * Base Path: /api/v1/patient/billing
 * 
 * @author Inua Afya Development Team
 * @version 1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */
@RestController
@RequestMapping("/api/v1/patient/billing")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Patient Billing", description = "Gestion de la facturation et paiements pour les patients")
@CrossOrigin(origins = "*")
public class PatientBillingController {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AdmissionRepository admissionRepository;
    private final PharmacyOrderRepository pharmacyOrderRepository;
    private final NotificationService notificationService;
    private final HospitalConfigRepository hospitalConfigRepository;
    private final com.hospital.backend.repository.PrescribedExamRepository prescribedExamRepository;

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * ENDPOINT PRINCIPAL: Historique de facturation consolidé
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * Fusionne les données de:
     * - Admissions (frais de fiche + consultation)
     * - Factures (Invoice)
     * - Commandes pharmacie (PharmacyOrder)
     * 
     * Tri: Date décroissante (plus récent d'abord)
     * 
     * GET /api/v1/patient/billing/history
     * 
     * @param pageable Pagination (page, size, sort)
     * @return PageResponse<BillingItemDTO> Liste paginée des transactions
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    @GetMapping("/history")
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    @Transactional(readOnly = true)
    @Operation(
        summary = "Historique de facturation consolidé",
        description = "Récupère l'historique complet incluant admissions, factures et commandes pharmacie"
    )
    public ResponseEntity<PageResponse<BillingItemDTO>> getBillingHistory(
            Pageable pageable) {
        if (pageable.getPageSize() > 100) {
            pageable = PageRequest.of(pageable.getPageNumber(), 100, pageable.getSort());
        }

        // Récupérer l'utilisateur authentifié depuis le SecurityContext
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            log.warn("⚠️ [BILLING] Utilisateur non authentifié - Accès refusé");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(PageResponse.<BillingItemDTO>builder()
                            .content(new ArrayList<>())
                            .message("Authentification requise. Veuillez vous connecter.")
                            .build());
        }

        String username = authentication.getName();
        log.info("📊 [BILLING] Récupération de l'historique pour: {}", username);

        // Récupérer le patient connecté
        User user = userRepository.findByEmailOrUsername(username, username).orElse(null);
        if (user == null) {
            log.warn("⚠️ [BILLING] Utilisateur non trouvé en base: {}", username);
            return ResponseEntity.ok(PageResponse.<BillingItemDTO>builder()
                    .content(new ArrayList<>())
                    .message("Utilisateur non trouvé")
                    .build());
        }
        log.info("✅ [BILLING] Utilisateur trouvé: {} (ID: {})", user.getUsername(), user.getId());

        Patient patient = patientRepository.findByUser(user).orElse(null);
        if (patient == null) {
            log.warn("⚠️ [BILLING] Profil patient inexistant pour l'utilisateur: {}", username);
            return ResponseEntity.ok(PageResponse.<BillingItemDTO>builder()
                    .content(new ArrayList<>())
                    .message("Aucun profil patient associé à ce compte. Veuillez contacter l'administration.")
                    .build());
        }
        log.info("✅ [BILLING] Patient trouvé: {} {} (ID: {})", patient.getFirstName(), patient.getLastName(), patient.getId());

        List<BillingItemDTO> allItems = new ArrayList<>();

        // ─────────────────────────────────────────────────────────────────
        // 1. FACTURES (Invoice) - Toutes sources (Réception, Pharmacie, Labo)
        // ─────────────────────────────────────────────────────────────────
        List<Invoice> invoices = invoiceRepository.findByPatientId(patient.getId(), Pageable.unpaged())
                .getContent();
        log.info("📋 [BILLING] {} factures trouvées pour patient {}", invoices.size(), patient.getId());
        
        for (Invoice invoice : invoices) {
            BillingItemDTO.BillingItemDTOBuilder itemBuilder = BillingItemDTO.builder()
                    .id("INV-" + invoice.getId())
                    .referenceNumber(invoice.getInvoiceCode())
                    .type(determineBillingType(invoice.getDepartmentSource()))
                    .source(invoice.getDepartmentSource() != null ? 
                            invoice.getDepartmentSource().name() : "INCONNU")
                    .title(buildInvoiceTitle(invoice))
                    .description(invoice.getNotes() != null ? invoice.getNotes() : "Prestations médicales")
                    .totalAmount(invoice.getTotalAmount())
                    .paidAmount(invoice.getPaidAmount() != null ? invoice.getPaidAmount() : BigDecimal.ZERO)
                    .balance(invoice.getTotalAmount().subtract(
                            invoice.getPaidAmount() != null ? invoice.getPaidAmount() : BigDecimal.ZERO))
                    .status(mapInvoiceStatus(invoice.getStatus()))
                    .paymentMethod(invoice.getPaymentMethod() != null ? 
                            invoice.getPaymentMethod().name() : null)
                    .createdAt(invoice.getCreatedAt())
                    .updatedAt(invoice.getUpdatedAt())
                    .paidAt(invoice.getPaidAt())
                    .currency(invoice.getCurrency() != null ? invoice.getCurrency().name() : "CDF")
                    .isPaid(invoice.getStatus() == InvoiceStatus.PAYEE)
                    .patientId(patient.getId())
                    .patientName(patient.getFirstName() + " " + patient.getLastName());

            // Ajouter les items de la facture
            if (invoice.getItems() != null && !invoice.getItems().isEmpty()) {
                List<BillingItemDTO.BillingItemDetailDTO> details = invoice.getItems().stream()
                        .map(this::mapInvoiceItemToDetail)
                        .collect(Collectors.toList());
                itemBuilder.items(details);
            }

            allItems.add(itemBuilder.build());
        }

        // ─────────────────────────────────────────────────────────────────
        // 2. ADMISSIONS - Frais de fiche et consultation
        // ─────────────────────────────────────────────────────────────────
        List<Admission> admissions = admissionRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId());
        log.info("📋 [BILLING] {} admissions trouvées pour patient {}", admissions.size(), patient.getId());
        
        for (Admission admission : admissions) {
            // Créer un item pour les frais de fiche si > 0
            if (admission.getRegistrationFee() != null && 
                admission.getRegistrationFee().compareTo(BigDecimal.ZERO) > 0) {
                
                allItems.add(BillingItemDTO.builder()
                        .id("ADM-FICHE-" + admission.getId())
                        .referenceNumber("FICHE-" + (admission.getAdmissionDate() != null ? 
                                admission.getAdmissionDate().getYear() : "2024") + "-" + admission.getId())
                        .type(BillingItemDTO.BillingType.FICHE)
                        .source("RECEPTION")
                        .title("Frais de fiche médicale")
                        .description("Enregistrement patient - " + (admission.getReasonForVisit() != null ? 
                                admission.getReasonForVisit() : "Consultation générale"))
                        .totalAmount(admission.getRegistrationFee())
                        .paidAmount(determineFichePaidAmount(admission))
                        .balance(admission.getRegistrationFee().subtract(determineFichePaidAmount(admission)))
                        .status(determineAdmissionStatus(admission, true))
                        .createdAt(admission.getCreatedAt())
                        .updatedAt(admission.getUpdatedAt())
                        .currency("USD")
                        .isPaid(determineAdmissionStatus(admission, true) == BillingItemDTO.PaymentStatus.PAYEE)
                        .patientId(patient.getId())
                        .patientName(patient.getFirstName() + " " + patient.getLastName())
                        .build());
            }

            // Créer un item pour les frais de consultation si > 0
            if (admission.getServiceFee() != null && 
                admission.getServiceFee().compareTo(BigDecimal.ZERO) > 0) {
                
                allItems.add(BillingItemDTO.builder()
                        .id("ADM-CONSUL-" + admission.getId())
                        .referenceNumber("CONSUL-" + (admission.getAdmissionDate() != null ? 
                                admission.getAdmissionDate().getYear() : "2024") + "-" + admission.getId())
                        .type(BillingItemDTO.BillingType.CONSULTATION)
                        .source("RECEPTION")
                        .title("Frais de consultation")
                        .description(admission.getReasonForVisit() != null ? 
                                admission.getReasonForVisit() : "Consultation médicale")
                        .totalAmount(admission.getServiceFee())
                        .paidAmount(determineConsultationPaidAmount(admission))
                        .balance(admission.getServiceFee().subtract(determineConsultationPaidAmount(admission)))
                        .status(determineAdmissionStatus(admission, false))
                        .createdAt(admission.getCreatedAt())
                        .updatedAt(admission.getUpdatedAt())
                        .currency("USD")
                        .isPaid(determineAdmissionStatus(admission, false) == BillingItemDTO.PaymentStatus.PAYEE)
                        .patientId(patient.getId())
                        .patientName(patient.getFirstName() + " " + patient.getLastName())
                        .build());
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // 3. COMMANDES PHARMACIE
        // ─────────────────────────────────────────────────────────────────
        List<PharmacyOrder> pharmacyOrders = pharmacyOrderRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId());
        log.info("📋 [BILLING] {} commandes pharmacie trouvées pour patient {}", pharmacyOrders.size(), patient.getId());
        
        for (PharmacyOrder order : pharmacyOrders) {
            BillingItemDTO.PaymentStatus status = mapPharmacyOrderStatus(order.getStatus());
            
            allItems.add(BillingItemDTO.builder()
                    .id("PHARMA-" + order.getId())
                    .referenceNumber(order.getOrderCode() != null ? order.getOrderCode() : "PH-" + order.getId())
                    .type(BillingItemDTO.BillingType.PHARMACIE)
                    .source("PHARMACIE")
                    .title("Achat de médicaments")
                    .description(order.getItems() != null ? 
                            order.getItems().size() + " médicament(s) prescrit(s)" : "Commande pharmacie")
                    .totalAmount(order.getTotalAmount())
                    .paidAmount(order.getAmountPaid() != null ? order.getAmountPaid() : BigDecimal.ZERO)
                    .balance(order.getTotalAmount().subtract(
                            order.getAmountPaid() != null ? order.getAmountPaid() : BigDecimal.ZERO))
                    .status(status)
                    .paymentMethod(order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null)
                    .createdAt(order.getCreatedAt())
                    .updatedAt(order.getUpdatedAt())
                    .paidAt(null)  // PharmacyOrder doesn't have paidAt field
                    .currency(order.getCurrency() != null ? order.getCurrency().name() : "CDF")
                    .isPaid(status == BillingItemDTO.PaymentStatus.PAYEE)
                    .patientId(patient.getId())
                    .patientName(patient.getFirstName() + " " + patient.getLastName())
                    // Items pharmacie
                    .items(order.getItems() != null ? order.getItems().stream()
                            .map(this::mapPharmacyItemToDetail)
                            .collect(Collectors.toList()) : null)
                    .build());
        }

        // ─────────────────────────────────────────────────────────────────
        // 4. EXAMENS DE LABORATOIRE (frais labo) — portés par PrescribedExam
        // ─────────────────────────────────────────────────────────────────
        List<PrescribedExam> labExams = prescribedExamRepository.findByPatientId(patient.getId());
        log.info("📋 [BILLING] {} examens labo trouvés pour patient {}", labExams.size(), patient.getId());

        for (PrescribedExam exam : labExams) {
            BigDecimal amount = exam.getTotalPrice() != null ? exam.getTotalPrice() : BigDecimal.ZERO;
            if (amount.compareTo(BigDecimal.ZERO) <= 0) continue; // ignorer les examens sans frais
            boolean paid = isExamPaid(exam.getStatus());
            allItems.add(BillingItemDTO.builder()
                    .id("LAB-" + exam.getId())
                    .referenceNumber("LAB-" + exam.getId())
                    .type(BillingItemDTO.BillingType.LABORATOIRE)
                    .source("LABORATOIRE")
                    .title(exam.getServiceName() != null ? exam.getServiceName() : "Examen de laboratoire")
                    .description("Analyse / examen de laboratoire")
                    .totalAmount(amount)
                    .paidAmount(paid ? amount : BigDecimal.ZERO)
                    .balance(paid ? BigDecimal.ZERO : amount)
                    .status(paid ? BillingItemDTO.PaymentStatus.PAYEE : BillingItemDTO.PaymentStatus.EN_ATTENTE)
                    .createdAt(exam.getCreatedAt())
                    .updatedAt(exam.getUpdatedAt())
                    .currency(exam.getCurrency() != null ? exam.getCurrency().name() : "USD")
                    .isPaid(paid)
                    .patientId(patient.getId())
                    .patientName(patient.getFirstName() + " " + patient.getLastName())
                    .build());
        }

        // ─────────────────────────────────────────────────────────────────
        // TRI: Date décroissante (plus récent d'abord)
        // ─────────────────────────────────────────────────────────────────
        log.info("📊 [BILLING] Total items avant tri: {}", allItems.size());
        allItems.sort(Comparator.comparing(BillingItemDTO::getCreatedAt, 
                Comparator.nullsLast(Comparator.reverseOrder())));
        log.info("📊 [BILLING] Total items après tri: {}", allItems.size());

        // ─────────────────────────────────────────────────────────────────
        // PAGINATION MANUELLE
        // ─────────────────────────────────────────────────────────────────
        int pageSize = pageable.getPageSize();
        int pageNumber = pageable.getPageNumber();
        int totalElements = allItems.size();
        int totalPages = (int) Math.ceil((double) totalElements / pageSize);
        
        int fromIndex = pageNumber * pageSize;
        int toIndex = Math.min(fromIndex + pageSize, totalElements);
        
        List<BillingItemDTO> paginatedItems = fromIndex < totalElements ? 
                allItems.subList(fromIndex, toIndex) : new ArrayList<>();

        PageResponse<BillingItemDTO> response = PageResponse.<BillingItemDTO>builder()
                .content(paginatedItems)
                .page(pageNumber)
                .size(pageSize)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .build();

        log.info("✅ [BILLING] {} transactions retournées pour {}", paginatedItems.size(), patient.getEmail());
        return ResponseEntity.ok(response);
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * STATISTIQUES DE FACTURATION PATIENT
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * GET /api/v1/patient/billing/stats
     * 
     * Retourne:
     * - totalPaid: Montant total payé
     * - totalPending: Montant en attente
     * - totalInvoiced: Montant total facturé
     * - invoiceCount: Nombre de factures
     * - pendingCount: Nombre de factures en attente
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    @Transactional(readOnly = true)
    @Operation(summary = "Statistiques de facturation")
    public ResponseEntity<BillingStatsDTO> getBillingStats() {

        // Récupérer l'utilisateur authentifié depuis le SecurityContext
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            log.warn("⚠️ [BILLING] Utilisateur non authentifié - Accès refusé");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(BillingStatsDTO.builder()
                            .totalPaid(BigDecimal.ZERO)
                            .totalPending(BigDecimal.ZERO)
                            .totalInvoiced(BigDecimal.ZERO)
                            .invoiceCount(0)
                            .paidCount(0)
                            .pendingCount(0)
                            .currency("CDF")
                            .lastUpdated(LocalDateTime.now())
                            .build());
        }

        String username = authentication.getName();

        User user = userRepository.findByEmailOrUsername(
                username,
                username
        ).orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        Patient patient = patientRepository.findByUser(user).orElse(null);
        if (patient == null) {
            log.warn("⚠️ [BILLING STATS] Profil patient inexistant pour l'utilisateur: {}", username);
            return ResponseEntity.ok(BillingStatsDTO.builder()
                    .totalPaid(BigDecimal.ZERO)
                    .totalPending(BigDecimal.ZERO)
                    .totalInvoiced(BigDecimal.ZERO)
                    .invoiceCount(0)
                    .paidCount(0)
                    .pendingCount(0)
                    .currency("CDF")
                    .lastUpdated(LocalDateTime.now())
                    .build());
        }

        // Calculer les stats
        BigDecimal totalPaid = BigDecimal.ZERO;
        BigDecimal totalPending = BigDecimal.ZERO;
        BigDecimal totalInvoiced = BigDecimal.ZERO;
        int paidCount = 0;
        int pendingCount = 0;

        // Factures
        List<Invoice> invoices = invoiceRepository.findByPatientId(patient.getId(), Pageable.unpaged()).getContent();
        for (Invoice inv : invoices) {
            totalInvoiced = totalInvoiced.add(inv.getTotalAmount());
            if (inv.getStatus() == InvoiceStatus.PAYEE) {
                totalPaid = totalPaid.add(inv.getTotalAmount());
                paidCount++;
            } else {
                totalPending = totalPending.add(inv.getTotalAmount());
                pendingCount++;
            }
        }

        // Admissions
        List<Admission> admissions = admissionRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId());
        for (Admission adm : admissions) {
            if (adm.getTotalAmount() != null) {
                totalInvoiced = totalInvoiced.add(adm.getTotalAmount());
                if (adm.getStatus() == Admission.AdmissionStatus.TERMINE ||
                    adm.getAmountPaid() != null && adm.getAmountPaid().compareTo(adm.getTotalAmount()) >= 0) {
                    totalPaid = totalPaid.add(adm.getTotalAmount());
                    paidCount++;
                } else {
                    totalPending = totalPending.add(adm.getTotalAmount().subtract(
                            adm.getAmountPaid() != null ? adm.getAmountPaid() : BigDecimal.ZERO));
                    pendingCount++;
                }
            }
        }

        // Commandes pharmacie
        List<PharmacyOrder> orders = pharmacyOrderRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId());
        for (PharmacyOrder order : orders) {
            totalInvoiced = totalInvoiced.add(order.getTotalAmount());
            if (order.getStatus() == PharmacyOrderStatus.PAYEE || order.getStatus() == PharmacyOrderStatus.LIVREE) {
                totalPaid = totalPaid.add(order.getTotalAmount());
                paidCount++;
            } else {
                totalPending = totalPending.add(order.getTotalAmount().subtract(
                        order.getAmountPaid() != null ? order.getAmountPaid() : BigDecimal.ZERO));
                pendingCount++;
            }
        }

        // Examens de laboratoire (frais labo)
        List<PrescribedExam> labExams = prescribedExamRepository.findByPatientId(patient.getId());
        int labCount = 0;
        for (PrescribedExam exam : labExams) {
            BigDecimal amount = exam.getTotalPrice() != null ? exam.getTotalPrice() : BigDecimal.ZERO;
            if (amount.compareTo(BigDecimal.ZERO) <= 0) continue;
            totalInvoiced = totalInvoiced.add(amount);
            labCount++;
            if (isExamPaid(exam.getStatus())) {
                totalPaid = totalPaid.add(amount);
                paidCount++;
            } else {
                totalPending = totalPending.add(amount);
                pendingCount++;
            }
        }

        BillingStatsDTO stats = BillingStatsDTO.builder()
                .totalPaid(totalPaid)
                .totalPending(totalPending)
                .totalInvoiced(totalInvoiced)
                .invoiceCount(invoices.size() + admissions.size() + orders.size() + labCount)
                .paidCount(paidCount)
                .pendingCount(pendingCount)
                .currency("CDF")
                .lastUpdated(LocalDateTime.now())
                .build();

        return ResponseEntity.ok(stats);
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * DÉTAIL D'UNE FACTURE AVEC QR CODE DE PAIEMENT
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * GET /api/v1/patient/billing/{id}/detail
     * 
     * Retourne les détails complets d'une facture avec un code de paiement
     * unique pour les factures en attente.
     * 
     * @param id L'identifiant de la facture (ex: INV-123, ADM-456, PHARMA-789)
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAuthority('ROLE_PATIENT')")
    @Operation(summary = "Détail d'une facture avec QR code")
    public ResponseEntity<BillingItemDTO> getBillingDetail(@PathVariable String id) {
        log.info("📄 [BILLING] Récupération du détail: {}", id);

        // Parser l'ID pour déterminer le type
        if (id.startsWith("INV-")) {
            Long invoiceId = Long.parseLong(id.replace("INV-", ""));
            Invoice invoice = invoiceRepository.findById(invoiceId)
                    .orElseThrow(() -> new ResourceNotFoundException("Facture non trouvée"));
            
            BillingItemDTO dto = mapInvoiceToDTO(invoice);
            // Générer un code de paiement unique si en attente
            if (!dto.getIsPaid()) {
                dto.setPaymentCode(generatePaymentCode(id));
            }
            return ResponseEntity.ok(dto);
        } 
        else if (id.startsWith("ADM-")) {
            Long admissionId = Long.parseLong(id.replaceAll("ADM-FICHE-|ADM-CONSUL-", ""));
            Admission admission = admissionRepository.findById(admissionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Admission non trouvée"));
            
            BillingItemDTO dto = mapAdmissionToDTO(admission, id.contains("FICHE"));
            if (!dto.getIsPaid()) {
                dto.setPaymentCode(generatePaymentCode(id));
            }
            return ResponseEntity.ok(dto);
        }
        else if (id.startsWith("PHARMA-")) {
            Long orderId = Long.parseLong(id.replace("PHARMA-", ""));
            PharmacyOrder order = pharmacyOrderRepository.findById(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Commande pharmacie non trouvée"));
            
            BillingItemDTO dto = mapPharmacyOrderToDTO(order);
            if (!dto.getIsPaid()) {
                dto.setPaymentCode(generatePaymentCode(id));
            }
            return ResponseEntity.ok(dto);
        }

        throw new ResourceNotFoundException("Type de facture non reconnu: " + id);
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // MÉTHODES UTILITAIRES (Helpers)
    // ═════════════════════════════════════════════════════════════════════════════

    private BillingItemDTO.BillingType determineBillingType(DepartmentSource source) {
        if (source == null) return BillingItemDTO.BillingType.AUTRE;
        return switch (source) {
            case RECEPTION -> BillingItemDTO.BillingType.CONSULTATION;
            case PHARMACY -> BillingItemDTO.BillingType.PHARMACIE;
            case LABORATORY -> BillingItemDTO.BillingType.LABORATOIRE;
            case DOCTOR -> BillingItemDTO.BillingType.LABORATOIRE;
            default -> BillingItemDTO.BillingType.AUTRE;
        };
    }

    private String buildInvoiceTitle(Invoice invoice) {
        return switch (invoice.getDepartmentSource()) {
            case RECEPTION -> "Consultation médicale";
            case PHARMACY -> "Médicaments prescrits";
            case LABORATORY, DOCTOR -> "Analyses laboratoire";
            default -> "Prestations médicales";
        };
    }

    private BillingItemDTO.PaymentStatus mapInvoiceStatus(InvoiceStatus status) {
        return switch (status) {
            case PAYEE -> BillingItemDTO.PaymentStatus.PAYEE;
            case EN_ATTENTE -> BillingItemDTO.PaymentStatus.EN_ATTENTE;
            case PARTIELLEMENT_PAYEE -> BillingItemDTO.PaymentStatus.PARTIEL;
            case ANNULEE -> BillingItemDTO.PaymentStatus.ANNULEE;
            default -> BillingItemDTO.PaymentStatus.EN_ATTENTE;
        };
    }

    private BillingItemDTO.PaymentStatus mapPharmacyOrderStatus(PharmacyOrderStatus status) {
        return switch (status) {
            case PAYEE, LIVREE -> BillingItemDTO.PaymentStatus.PAYEE;
            case EN_ATTENTE_PAIEMENT -> BillingItemDTO.PaymentStatus.EN_ATTENTE;
            case PARTIELLEMENT_PAYEE -> BillingItemDTO.PaymentStatus.PARTIEL;
            case ANNULEE -> BillingItemDTO.PaymentStatus.ANNULEE;
            default -> BillingItemDTO.PaymentStatus.EN_ATTENTE;
        };
    }

    /** Un examen de labo est considéré payé dès qu'il a franchi l'étape caisse. */
    private boolean isExamPaid(PrescribedExamStatus status) {
        if (status == null) return false;
        return switch (status) {
            case PAID, PAID_PENDING_LAB, IN_PROGRESS, COMPLETED,
                 RESULTS_AVAILABLE, DELIVERED_TO_DOCTOR, ARCHIVED -> true;
            default -> false; // PENDING, PRESCRIBED, ADJUSTED_BY_CASHIER
        };
    }

    private BigDecimal determineFichePaidAmount(Admission admission) {
        if (admission.getStatus() == Admission.AdmissionStatus.TERMINE) {
            return admission.getRegistrationFee() != null ? admission.getRegistrationFee() : BigDecimal.ZERO;
        }
        // Si partiellement payé, estimer basé sur le ratio
        if (admission.getAmountPaid() != null && admission.getTotalAmount() != null 
                && admission.getTotalAmount().compareTo(BigDecimal.ZERO) > 0
                && admission.getRegistrationFee() != null) {
            BigDecimal ratio = admission.getRegistrationFee().divide(admission.getTotalAmount(), 4, RoundingMode.HALF_UP);
            return admission.getAmountPaid().multiply(ratio).setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal determineConsultationPaidAmount(Admission admission) {
        if (admission.getStatus() == Admission.AdmissionStatus.TERMINE) {
            return admission.getServiceFee() != null ? admission.getServiceFee() : BigDecimal.ZERO;
        }
        // Calculer le reste après la fiche
        BigDecimal fichePaid = determineFichePaidAmount(admission);
        if (admission.getAmountPaid() != null) {
            BigDecimal remaining = admission.getAmountPaid().subtract(fichePaid);
            return remaining.max(BigDecimal.ZERO);
        }
        return BigDecimal.ZERO;
    }

    private BillingItemDTO.PaymentStatus determineAdmissionStatus(Admission admission, boolean isFiche) {
        if (admission.getStatus() == Admission.AdmissionStatus.TERMINE) {
            return BillingItemDTO.PaymentStatus.PAYEE;
        }
        if (admission.getStatus() == Admission.AdmissionStatus.ANNULE) {
            return BillingItemDTO.PaymentStatus.ANNULEE;
        }
        
        BigDecimal paid = isFiche ? determineFichePaidAmount(admission) : determineConsultationPaidAmount(admission);
        BigDecimal total = isFiche ? admission.getRegistrationFee() : admission.getServiceFee();
        
        if (total != null && total.compareTo(BigDecimal.ZERO) > 0) {
            if (paid.compareTo(total) >= 0) return BillingItemDTO.PaymentStatus.PAYEE;
            if (paid.compareTo(BigDecimal.ZERO) > 0) return BillingItemDTO.PaymentStatus.PARTIEL;
        }
        return BillingItemDTO.PaymentStatus.EN_ATTENTE;
    }

    private BillingItemDTO.BillingItemDetailDTO mapInvoiceItemToDetail(InvoiceItem item) {
        return BillingItemDTO.BillingItemDetailDTO.builder()
                .id(item.getId())
                .description(item.getDescription())
                .quantity(item.getQuantity() != null ? item.getQuantity() : 1)
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .build();
    }

    private BillingItemDTO.BillingItemDetailDTO mapPharmacyItemToDetail(PharmacyOrderItem item) {
        return BillingItemDTO.BillingItemDetailDTO.builder()
                .id(item.getId())
                .description(item.getMedication() != null ? 
                        item.getMedication().getName() : "Médicament")
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .build();
    }

    private BillingItemDTO mapInvoiceToDTO(Invoice invoice) {
        return BillingItemDTO.builder()
                .id("INV-" + invoice.getId())
                .originalId(invoice.getId())
                .referenceNumber(invoice.getInvoiceCode())
                .type(determineBillingType(invoice.getDepartmentSource()))
                .source(invoice.getDepartmentSource() != null ? invoice.getDepartmentSource().name() : "INCONNU")
                .title(buildInvoiceTitle(invoice))
                .description(invoice.getNotes())
                .totalAmount(invoice.getTotalAmount())
                .paidAmount(invoice.getPaidAmount())
                .balance(invoice.getTotalAmount().subtract(invoice.getPaidAmount() != null ? 
                        invoice.getPaidAmount() : BigDecimal.ZERO))
                .status(mapInvoiceStatus(invoice.getStatus()))
                .isPaid(invoice.getStatus() == InvoiceStatus.PAYEE)
                .createdAt(invoice.getCreatedAt())
                .paidAt(invoice.getPaidAt())
                .currency(invoice.getCurrency() != null ? invoice.getCurrency().name() : "CDF")
                .build();
    }

    private BillingItemDTO mapAdmissionToDTO(Admission admission, boolean isFiche) {
        BigDecimal total = isFiche ? admission.getRegistrationFee() : admission.getServiceFee();
        BigDecimal paid = isFiche ? determineFichePaidAmount(admission) : determineConsultationPaidAmount(admission);
        
        return BillingItemDTO.builder()
                .id(isFiche ? "ADM-FICHE-" + admission.getId() : "ADM-CONSUL-" + admission.getId())
                .originalId(admission.getId())
                .referenceNumber((isFiche ? "FICHE-" : "CONSUL-") + admission.getId())
                .type(isFiche ? BillingItemDTO.BillingType.FICHE : BillingItemDTO.BillingType.CONSULTATION)
                .source("RECEPTION")
                .title(isFiche ? "Frais de fiche médicale" : "Frais de consultation")
                .description(admission.getReasonForVisit())
                .totalAmount(total)
                .paidAmount(paid)
                .balance(total.subtract(paid))
                .status(determineAdmissionStatus(admission, isFiche))
                .isPaid(determineAdmissionStatus(admission, isFiche) == BillingItemDTO.PaymentStatus.PAYEE)
                .createdAt(admission.getCreatedAt())
                .currency("USD")
                .build();
    }

    private BillingItemDTO mapPharmacyOrderToDTO(PharmacyOrder order) {
        return BillingItemDTO.builder()
                .id("PHARMA-" + order.getId())
                .originalId(order.getId())
                .referenceNumber(order.getOrderCode())
                .type(BillingItemDTO.BillingType.PHARMACIE)
                .source("PHARMACIE")
                .title("Achat de médicaments")
                .description(order.getItems() != null ? order.getItems().size() + " médicament(s)" : "Commande pharmacie")
                .totalAmount(order.getTotalAmount())
                .paidAmount(order.getAmountPaid())
                .balance(order.getTotalAmount().subtract(order.getAmountPaid() != null ?
                        order.getAmountPaid() : BigDecimal.ZERO))
                .status(mapPharmacyOrderStatus(order.getStatus()))
                .isPaid(mapPharmacyOrderStatus(order.getStatus()) == BillingItemDTO.PaymentStatus.PAYEE)
                .createdAt(order.getCreatedAt())
                .paidAt(null)  // PharmacyOrder doesn't have paidAt field
                .currency(order.getCurrency() != null ? order.getCurrency().name() : "CDF")
                .items(order.getItems() != null ? order.getItems().stream()
                        .map(this::mapPharmacyItemToDetail)
                        .collect(Collectors.toList()) : null)
                .build();
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * ENDPOINT: Téléchargement PDF de la facture
     * ═══════════════════════════════════════════════════════════════════════════════
     * 
     * Retourne un PDF simple contenant les informations de la facture.
     * Vérifie que le patient authentifié est bien le propriétaire de la facture.
     * 
     * GET /api/v1/patient/billing/{id}/pdf
     * 
     * @param id ID de la facture
     * @return ResponseEntity<byte[]> PDF de la facture
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasRole('PATIENT')")
    @Transactional(readOnly = true)
    @Operation(summary = "Télécharger le PDF d'une facture", description = "Retourne le PDF de la facture pour le patient authentifié")
    public ResponseEntity<byte[]> downloadInvoicePDF(@PathVariable Long id) {
        try {
            log.info("📄 [BILLING] Téléchargement PDF demandé pour facture ID: {}", id);
            
            if (id == null || id <= 0) {
                log.warn("⚠️ [BILLING] ID de facture invalide: {}", id);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
            
            // Récupérer l'utilisateur authentifié
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                log.warn("⚠️ [BILLING] Utilisateur non authentifié");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            String username = authentication.getName();
            
            // Vérifier que l'utilisateur existe et a un profil patient
            User user = userRepository.findByEmailOrUsername(username, username).orElse(null);
            if (user == null) {
                log.warn("⚠️ [BILLING] Utilisateur non trouvé pour username: {}", username);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            Patient patient = patientRepository.findByUser(user).orElse(null);
            if (patient == null) {
                log.warn("⚠️ [BILLING] Profil patient non trouvé pour user: {}", username);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            
            // Récupérer la facture avec ses items (fetch eager via query si nécessaire)
            Invoice invoice = invoiceRepository.findById(id).orElse(null);
            if (invoice == null) {
                log.warn("⚠️ [BILLING] Facture ID {} non trouvée", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            
            // Vérifier que la facture appartient bien au patient
            if (invoice.getPatient() == null || !invoice.getPatient().getId().equals(patient.getId())) {
                log.warn("⚠️ [BILLING] Accès refusé - Facture {} n'appartient pas au patient {}", id, patient.getId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            
            // Calculer le solde restant
            BigDecimal paidAmount = invoice.getPaidAmount() != null ? invoice.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal balance = invoice.getTotalAmount().subtract(paidAmount);
            String currency = invoice.getCurrency() != null ? invoice.getCurrency().name() : "USD";
            
            // Récupérer la configuration complète de l'hôpital
            HospitalConfig config = hospitalConfigRepository.findFirstByOrderByIdAsc().orElse(null);
            
            // === INFORMATIONS PRINCIPALES ===
            String hospitalName = config != null && config.getHospitalName() != null ? config.getHospitalName() : "INUA AFYA";
            String hospitalCode = config != null && config.getHospitalCode() != null ? config.getHospitalCode() : "";
            String hospitalLogoUrl = config != null && config.getHospitalLogoUrl() != null ? config.getHospitalLogoUrl() : "";
            Boolean enableLogoOnDocuments = config != null && (config.getEnableLogoOnDocuments() == null || Boolean.TRUE.equals(config.getEnableLogoOnDocuments()));
            
            // === INFORMATIONS ADMINISTRATIVES ===
            String ministryName = config != null && config.getMinistryName() != null ? config.getMinistryName() : "";
            String departmentName = config != null && config.getDepartmentName() != null ? config.getDepartmentName() : "";
            String zoneName = config != null && config.getZoneName() != null ? config.getZoneName() : "";
            String region = config != null && config.getRegion() != null ? config.getRegion() : "";
            String city = config != null && config.getCity() != null ? config.getCity() : "";
            String country = config != null && config.getCountry() != null ? config.getCountry() : "";
            
            // === CONTACTS ===
            String address = config != null && config.getAddress() != null ? config.getAddress() : "";
            String phone = config != null && config.getPhoneNumber() != null ? config.getPhoneNumber() : "";
            String email = config != null && config.getEmail() != null ? config.getEmail() : "";
            String website = config != null && config.getWebsite() != null ? config.getWebsite() : "";
            String postalCode = config != null && config.getPostalCode() != null ? config.getPostalCode() : "";
            
            // === INFORMATIONS LÉGALES ===
            String taxId = config != null && config.getTaxId() != null ? config.getTaxId() : "";
            String registrationNumber = config != null && config.getRegistrationNumber() != null ? config.getRegistrationNumber() : "";
            String licenseNumber = config != null && config.getLicenseNumber() != null ? config.getLicenseNumber() : "";
            
            // === PERSONNALISATION DES FICHES ===
            String headerTitle = config != null && config.getHeaderTitle() != null ? config.getHeaderTitle() : "";
            String headerSubtitle = config != null && config.getHeaderSubtitle() != null ? config.getHeaderSubtitle() : "";
            String footerText = config != null && config.getFooterText() != null ? config.getFooterText() : "Merci pour votre confiance";
            String documentWatermark = config != null && config.getDocumentWatermark() != null ? config.getDocumentWatermark() : "";
            Boolean enableWatermark = config != null && config.getEnableWatermark() != null ? config.getEnableWatermark() : false;
            Boolean enableSignature = config != null && config.getEnableSignature() != null ? config.getEnableSignature() : false;
            
            // === COULEURS ===
            java.awt.Color primaryColor = new java.awt.Color(0, 128, 128);
            java.awt.Color secondaryColor = new java.awt.Color(0, 100, 100);
            if (config != null && config.getPrimaryColor() != null && !config.getPrimaryColor().isEmpty()) {
                try {
                    primaryColor = java.awt.Color.decode(config.getPrimaryColor());
                    secondaryColor = primaryColor.darker();
                } catch (Exception e) {
                    log.warn("Couleur primaire invalide: {}, utilisation du défaut", config.getPrimaryColor());
                }
            }
            if (config != null && config.getSecondaryColor() != null && !config.getSecondaryColor().isEmpty()) {
                try {
                    secondaryColor = java.awt.Color.decode(config.getSecondaryColor());
                } catch (Exception e) {
                    log.warn("Couleur secondaire invalide, utilisation du défaut");
                }
            }
            
            // === DEVISE ET FORMAT ===
            String currencyCode = config != null && config.getCurrencyCode() != null ? config.getCurrencyCode() : "USD";
            String currencySymbol = config != null && config.getCurrencySymbol() != null ? config.getCurrencySymbol() : "$";
            String dateFormat = config != null && config.getDateFormat() != null ? config.getDateFormat() : "yyyy-MM-dd";
            
            // LOGS DE DÉBOGAGE - Vérifier ce qui est récupéré
            log.info("📋 [PDF DEBUG] Config trouvée: {}", config != null ? "OUI" : "NON");
            if (config != null) {
                log.info("📋 [PDF DEBUG] hospitalName from DB: '{}'", config.getHospitalName());
                log.info("📋 [PDF DEBUG] hospitalName used: '{}'", hospitalName);
                log.info("📋 [PDF DEBUG] headerTitle: '{}'", headerTitle);
                log.info("📋 [PDF DEBUG] ministryName: '{}'", ministryName);
                log.info("📋 [PDF DEBUG] address: '{}'", address);
                log.info("📋 [PDF DEBUG] city: '{}'", city);
                log.info("📋 [PDF DEBUG] phone: '{}'", phone);
                log.info("📋 [PDF DEBUG] primaryColor: '{}'", config.getPrimaryColor());
            } else {
                log.warn("⚠️ [PDF DEBUG] AUCUNE CONFIGURATION TROUVÉE - Utilisation des valeurs par défaut");
            }
            
            // Générer un vrai PDF avec OpenPDF
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 50, 50, 50, 50);
            PdfWriter.getInstance(document, baos);
            document.open();
            
            // Polices
            Font titleFont = new Font(Font.HELVETICA, 24, Font.BOLD, primaryColor);
            Font hospitalFont = new Font(Font.HELVETICA, 14, Font.BOLD);
            Font headerFont = new Font(Font.HELVETICA, 11, Font.BOLD, java.awt.Color.WHITE);
            Font normalFont = new Font(Font.HELVETICA, 10, Font.NORMAL);
            Font boldFont = new Font(Font.HELVETICA, 10, Font.BOLD);
            Font smallFont = new Font(Font.HELVETICA, 9, Font.NORMAL);
            Font labelFont = new Font(Font.HELVETICA, 9, Font.NORMAL, java.awt.Color.GRAY);
            
            // ========== EN-TÊTE COMPLET AVEC TOUTES LES INFOS HÔPITAL ==========
            
            // Ligne 1: Logo area + En-tête administratif (Ministère, Département, Zone)
            if (!ministryName.isEmpty() || !departmentName.isEmpty() || !zoneName.isEmpty()) {
                PdfPTable adminHeaderTable = new PdfPTable(1);
                adminHeaderTable.setWidthPercentage(100);
                
                PdfPCell adminCell = new PdfPCell();
                adminCell.setBorder(Rectangle.NO_BORDER);
                adminCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                
                Font adminFont = new Font(Font.HELVETICA, 8, Font.NORMAL, java.awt.Color.DARK_GRAY);
                StringBuilder adminLine = new StringBuilder();
                if (!ministryName.isEmpty()) adminLine.append(ministryName);
                if (!departmentName.isEmpty()) {
                    if (adminLine.length() > 0) adminLine.append(" | ");
                    adminLine.append(departmentName);
                }
                if (!zoneName.isEmpty()) {
                    if (adminLine.length() > 0) adminLine.append(" | ");
                    adminLine.append(zoneName);
                }
                if (!region.isEmpty()) {
                    if (adminLine.length() > 0) adminLine.append(" | ");
                    adminLine.append(region);
                }
                if (adminLine.length() > 0) {
                    Paragraph adminPara = new Paragraph(adminLine.toString(), adminFont);
                    adminPara.setAlignment(Element.ALIGN_CENTER);
                    adminCell.addElement(adminPara);
                    adminHeaderTable.addCell(adminCell);
                    document.add(adminHeaderTable);
                }
            }
            
            // Ligne 2: Logo placeholder / Titre personnalisé + Nom de l'hôpital
            PdfPTable mainHeaderTable = new PdfPTable(2);
            mainHeaderTable.setWidthPercentage(100);
            mainHeaderTable.setWidths(new float[]{2, 1});
            
            // Colonne gauche: Logo + Titre hôpital complet
            PdfPCell leftCell = new PdfPCell();
            leftCell.setBorder(Rectangle.NO_BORDER);
            leftCell.setVerticalAlignment(Element.ALIGN_TOP);
            
            // Logo de l'hôpital (chargé depuis URL ou base64)
            if (enableLogoOnDocuments && !hospitalLogoUrl.isEmpty()) {
                try {
                    Image logoImage = null;
                    
                    // Vérifier si c'est du base64
                    if (hospitalLogoUrl.startsWith("data:image")) {
                        // Extraire les données base64
                        String base64Data = hospitalLogoUrl.substring(hospitalLogoUrl.indexOf(",") + 1);
                        byte[] imageBytes = Base64.getDecoder().decode(base64Data);
                        logoImage = Image.getInstance(imageBytes);
                    } else if (hospitalLogoUrl.startsWith("http://") || hospitalLogoUrl.startsWith("https://")) {
                        // Charger depuis URL
                        URL logoUrl = new URL(hospitalLogoUrl);
                        logoImage = Image.getInstance(logoUrl);
                    }
                    
                    // Redimensionner et ajouter le logo
                    if (logoImage != null) {
                        // Taille max: 80px de hauteur, ratio conservé
                        float maxHeight = 80;
                        float maxWidth = 150;
                        if (logoImage.getHeight() > maxHeight) {
                            logoImage.scaleToFit(maxWidth, maxHeight);
                        }
                        logoImage.setAlignment(Element.ALIGN_LEFT);
                        leftCell.addElement(logoImage);
                        
                        // Espace après le logo
                        Paragraph spacer = new Paragraph(" ", smallFont);
                        spacer.setLeading(0, 0.5f);
                        leftCell.addElement(spacer);
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Impossible de charger le logo: {}", e.getMessage());
                    // Fallback: afficher le nom de l'hôpital en plus gros
                    Paragraph logoFallback = new Paragraph("[LOGO]", 
                        new Font(Font.HELVETICA, 12, Font.BOLD, secondaryColor));
                    logoFallback.setLeading(0, 1f);
                    leftCell.addElement(logoFallback);
                }
            }
            
            // Titre principal = NOM DE L'HÔPITAL (toujours)
            String mainTitle = hospitalName;
            log.info("📋 [PDF DEBUG] mainTitle final utilisé: '{}'", mainTitle);
            
            Paragraph mainTitlePara = new Paragraph(mainTitle.toUpperCase(), 
                new Font(Font.HELVETICA, 16, Font.BOLD, primaryColor));
            mainTitlePara.setLeading(0, 1.3f);
            leftCell.addElement(mainTitlePara);
            
            
            // Sous-titre 2: headerSubtitle si défini
            if (!headerSubtitle.isEmpty()) {
                Paragraph subtitlePara = new Paragraph(headerSubtitle, 
                    new Font(Font.HELVETICA, 10, Font.ITALIC, secondaryColor));
                subtitlePara.setLeading(0, 1.2f);
                leftCell.addElement(subtitlePara);
            }
            
            // Code hôpital
            if (!hospitalCode.isEmpty()) {
                Paragraph codePara = new Paragraph("Code Établissement: " + hospitalCode, smallFont);
                codePara.setLeading(0, 1.2f);
                leftCell.addElement(codePara);
            }
            
            // Informations légales - uniquement si configurées par admin (pas de valeurs génériques)
            StringBuilder legalInfo = new StringBuilder();
            boolean hasRealRegistration = !registrationNumber.isEmpty() && !registrationNumber.equals("REG-000000") && !registrationNumber.startsWith("REG-");
            boolean hasRealLicense = !licenseNumber.isEmpty() && !licenseNumber.equals("LIC-000000") && !licenseNumber.startsWith("LIC-");
            boolean hasRealTax = !taxId.isEmpty() && !taxId.equals("TAX-000000") && !taxId.startsWith("TAX-");
            
            if (hasRealRegistration) legalInfo.append("RCCM: ").append(registrationNumber);
            if (hasRealLicense) {
                if (legalInfo.length() > 0) legalInfo.append(" | ");
                legalInfo.append("Licence: ").append(licenseNumber);
            }
            if (hasRealTax) {
                if (legalInfo.length() > 0) legalInfo.append(" | ");
                legalInfo.append("N° TVA: ").append(taxId);
            }
            if (legalInfo.length() > 0) {
                Paragraph legalPara = new Paragraph(legalInfo.toString(), 
                    new Font(Font.HELVETICA, 8, Font.NORMAL, java.awt.Color.DARK_GRAY));
                legalPara.setLeading(0, 1.2f);
                leftCell.addElement(legalPara);
            }
            
            mainHeaderTable.addCell(leftCell);
            
            // Colonne droite: FACTURE + Devise
            PdfPCell rightCell = new PdfPCell();
            rightCell.setBorder(Rectangle.NO_BORDER);
            rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            rightCell.setVerticalAlignment(Element.ALIGN_TOP);
            
            Paragraph invoiceTitle = new Paragraph("FACTURE", titleFont);
            invoiceTitle.setAlignment(Element.ALIGN_RIGHT);
            rightCell.addElement(invoiceTitle);
            
            if (!currencyCode.isEmpty()) {
                Paragraph currencyPara = new Paragraph("Devise: " + currencyCode + " (" + currencySymbol + ")", smallFont);
                currencyPara.setAlignment(Element.ALIGN_RIGHT);
                currencyPara.setLeading(0, 1.2f);
                rightCell.addElement(currencyPara);
            }
            
            mainHeaderTable.addCell(rightCell);
            document.add(mainHeaderTable);
            
            // Ligne 3: Coordonnées complètes
            PdfPTable contactTable = new PdfPTable(1);
            contactTable.setWidthPercentage(100);
            
            PdfPCell contactCell = new PdfPCell();
            contactCell.setBorder(Rectangle.NO_BORDER);
            
            StringBuilder addressLine = new StringBuilder();
            if (!address.isEmpty()) addressLine.append(address);
            if (!postalCode.isEmpty()) {
                if (addressLine.length() > 0) addressLine.append(" - ");
                addressLine.append("BP ").append(postalCode);
            }
            if (!city.isEmpty()) {
                if (addressLine.length() > 0) addressLine.append(", ");
                addressLine.append(city);
            }
            if (!country.isEmpty()) {
                if (addressLine.length() > 0) addressLine.append(", ");
                addressLine.append(country);
            }
            if (addressLine.length() > 0) {
                Paragraph addrPara = new Paragraph(addressLine.toString(), smallFont);
                addrPara.setLeading(0, 1.1f);
                contactCell.addElement(addrPara);
            }
            
            StringBuilder contactLine = new StringBuilder();
            if (!phone.isEmpty()) contactLine.append("Tél: ").append(phone);
            if (!email.isEmpty()) {
                if (contactLine.length() > 0) contactLine.append(" | ");
                contactLine.append("Email: ").append(email);
            }
            if (!website.isEmpty()) {
                if (contactLine.length() > 0) contactLine.append(" | ");
                contactLine.append("Web: ").append(website);
            }
            if (contactLine.length() > 0) {
                Paragraph contactPara = new Paragraph(contactLine.toString(), smallFont);
                contactPara.setLeading(0, 1.1f);
                contactCell.addElement(contactPara);
            }
            
            contactTable.addCell(contactCell);
            document.add(contactTable);
            document.add(new Paragraph(" ", normalFont));
            
            // Ligne de séparation colorée
            PdfPTable lineTable = new PdfPTable(1);
            lineTable.setWidthPercentage(100);
            PdfPCell lineCell = new PdfPCell();
            lineCell.setBorder(Rectangle.BOTTOM);
            lineCell.setBorderColor(primaryColor);
            lineCell.setBorderWidth(3);
            lineCell.setFixedHeight(5);
            lineTable.addCell(lineCell);
            document.add(lineTable);
            document.add(new Paragraph(" ", normalFont));
            
            // ========== INFOS FACTURE ET PATIENT ==========
            PdfPTable infoMainTable = new PdfPTable(2);
            infoMainTable.setWidthPercentage(100);
            infoMainTable.setWidths(new float[]{1, 1});
            infoMainTable.getDefaultCell().setBorder(Rectangle.NO_BORDER);
            
            // FACTURÉ À (Patient)
            PdfPCell billToCell = new PdfPCell();
            billToCell.setBorder(Rectangle.NO_BORDER);
            Paragraph billToLabel = new Paragraph("FACTURÉ À:", labelFont);
            billToCell.addElement(billToLabel);
            Paragraph patientName = new Paragraph(patient.getFirstName() + " " + patient.getLastName(), boldFont);
            patientName.setLeading(0, 1.3f);
            billToCell.addElement(patientName);
            if (patient.getAddress() != null && !patient.getAddress().isEmpty()) {
                Paragraph patAddr = new Paragraph(patient.getAddress(), smallFont);
                patAddr.setLeading(0, 1.2f);
                billToCell.addElement(patAddr);
            }
            if (patient.getPhoneNumber() != null && !patient.getPhoneNumber().isEmpty()) {
                Paragraph patPhone = new Paragraph("Tél: " + patient.getPhoneNumber(), smallFont);
                patPhone.setLeading(0, 1.2f);
                billToCell.addElement(patPhone);
            }
            infoMainTable.addCell(billToCell);
            
            // DÉTAILS FACTURE (droite)
            PdfPCell invoiceDetailsCell = new PdfPCell();
            invoiceDetailsCell.setBorder(Rectangle.NO_BORDER);
            invoiceDetailsCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            
            PdfPTable detailsTable = new PdfPTable(2);
            detailsTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            detailsTable.getDefaultCell().setBorder(Rectangle.NO_BORDER);
            
            detailsTable.addCell(new Phrase("N° Facture:", labelFont));
            PdfPCell invNumCell = new PdfPCell(new Phrase(invoice.getInvoiceCode() != null ? invoice.getInvoiceCode() : "N/A", boldFont));
            invNumCell.setBorder(Rectangle.NO_BORDER);
            invNumCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            detailsTable.addCell(invNumCell);
            
            detailsTable.addCell(new Phrase("Date:", labelFont));
            PdfPCell dateCell = new PdfPCell(new Phrase(invoice.getCreatedAt() != null ? invoice.getCreatedAt().toLocalDate().toString() : "N/A", normalFont));
            dateCell.setBorder(Rectangle.NO_BORDER);
            dateCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            detailsTable.addCell(dateCell);
            
            detailsTable.addCell(new Phrase("Statut:", labelFont));
            String statusText = invoice.getStatus() != null ? invoice.getStatus().toString() : "N/A";
            if (statusText.equals("PAYEE")) statusText = "Payée";
            else if (statusText.equals("EN_ATTENTE")) statusText = "En attente";
            else if (statusText.equals("PARTIELLEMENT_PAYEE")) statusText = "Partiellement payée";
            PdfPCell statusCell = new PdfPCell(new Phrase(statusText, boldFont));
            statusCell.setBorder(Rectangle.NO_BORDER);
            statusCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            detailsTable.addCell(statusCell);
            
            if (!taxId.isEmpty()) {
                detailsTable.addCell(new Phrase("N° TVA:", labelFont));
                PdfPCell taxCell = new PdfPCell(new Phrase(taxId, smallFont));
                taxCell.setBorder(Rectangle.NO_BORDER);
                taxCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                detailsTable.addCell(taxCell);
            }
            
            invoiceDetailsCell.addElement(detailsTable);
            infoMainTable.addCell(invoiceDetailsCell);
            
            document.add(infoMainTable);
            document.add(new Paragraph(" ", normalFont));
            document.add(new Paragraph(" ", normalFont));
            
            // ========== TABLE DES ARTICLES ==========
            PdfPTable itemsTable = new PdfPTable(4);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{0.5f, 3, 1, 1.5f});
            
            // En-têtes avec fond coloré
            PdfPCell qtyHeader = new PdfPCell(new Phrase("QTÉ", headerFont));
            qtyHeader.setBackgroundColor(primaryColor);
            qtyHeader.setPadding(8);
            qtyHeader.setBorder(Rectangle.NO_BORDER);
            itemsTable.addCell(qtyHeader);
            
            PdfPCell descHeader = new PdfPCell(new Phrase("DESCRIPTION", headerFont));
            descHeader.setBackgroundColor(primaryColor);
            descHeader.setPadding(8);
            descHeader.setBorder(Rectangle.NO_BORDER);
            itemsTable.addCell(descHeader);
            
            PdfPCell unitHeader = new PdfPCell(new Phrase("PRIX UNIT.", headerFont));
            unitHeader.setBackgroundColor(primaryColor);
            unitHeader.setPadding(8);
            unitHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
            unitHeader.setBorder(Rectangle.NO_BORDER);
            itemsTable.addCell(unitHeader);
            
            PdfPCell totalHeader = new PdfPCell(new Phrase("MONTANT", headerFont));
            totalHeader.setBackgroundColor(primaryColor);
            totalHeader.setPadding(8);
            totalHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalHeader.setBorder(Rectangle.NO_BORDER);
            itemsTable.addCell(totalHeader);
            
            // Lignes alternées
            java.awt.Color lightBg = new java.awt.Color(245, 245, 245);
            boolean even = true;
            
            List<InvoiceItem> items = invoice.getItems();
            if (items != null && !items.isEmpty()) {
                for (InvoiceItem item : items) {
                    String description = item.getDescription() != null ? item.getDescription() : "Prestation médicale";
                    String quantity = item.getQuantity() != null ? item.getQuantity().toString() : "1";
                    BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
                    BigDecimal totalPrice = item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO;
                    
                    PdfPCell qtyCell = new PdfPCell(new Phrase(quantity, normalFont));
                    qtyCell.setPadding(6);
                    qtyCell.setBorder(Rectangle.NO_BORDER);
                    if (even) qtyCell.setBackgroundColor(lightBg);
                    itemsTable.addCell(qtyCell);
                    
                    PdfPCell descCell = new PdfPCell(new Phrase(description, normalFont));
                    descCell.setPadding(6);
                    descCell.setBorder(Rectangle.NO_BORDER);
                    if (even) descCell.setBackgroundColor(lightBg);
                    itemsTable.addCell(descCell);
                    
                    PdfPCell unitCell = new PdfPCell(new Phrase(unitPrice + " " + currency, normalFont));
                    unitCell.setPadding(6);
                    unitCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    unitCell.setBorder(Rectangle.NO_BORDER);
                    if (even) unitCell.setBackgroundColor(lightBg);
                    itemsTable.addCell(unitCell);
                    
                    PdfPCell totalCell = new PdfPCell(new Phrase(totalPrice + " " + currency, normalFont));
                    totalCell.setPadding(6);
                    totalCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    totalCell.setBorder(Rectangle.NO_BORDER);
                    if (even) totalCell.setBackgroundColor(lightBg);
                    itemsTable.addCell(totalCell);
                    
                    even = !even;
                }
            } else {
                PdfPCell emptyCell = new PdfPCell(new Phrase("Aucun détail disponible", normalFont));
                emptyCell.setColspan(4);
                emptyCell.setPadding(6);
                emptyCell.setBorder(Rectangle.NO_BORDER);
                itemsTable.addCell(emptyCell);
            }
            document.add(itemsTable);
            
            // Ligne de séparation
            document.add(new Paragraph(" ", normalFont));
            PdfPTable sepTable = new PdfPTable(1);
            sepTable.setWidthPercentage(100);
            PdfPCell sepCell = new PdfPCell();
            sepCell.setBorder(Rectangle.BOTTOM);
            sepCell.setBorderColor(java.awt.Color.LIGHT_GRAY);
            sepCell.setFixedHeight(1);
            sepTable.addCell(sepCell);
            document.add(sepTable);
            document.add(new Paragraph(" ", normalFont));
            
            // ========== TOTAUX ==========
            PdfPTable totalsMainTable = new PdfPTable(2);
            totalsMainTable.setWidthPercentage(100);
            totalsMainTable.setWidths(new float[]{2, 1});
            totalsMainTable.getDefaultCell().setBorder(Rectangle.NO_BORDER);
            
            // Colonne vide à gauche
            totalsMainTable.addCell(new PdfPCell());
            
            // Totaux à droite
            PdfPTable totalsTable = new PdfPTable(2);
            totalsTable.getDefaultCell().setBorder(Rectangle.NO_BORDER);
            
            totalsTable.addCell(new Phrase("Sous-total:", normalFont));
            PdfPCell subtotalCell = new PdfPCell(new Phrase(invoice.getTotalAmount() + " " + currency, normalFont));
            subtotalCell.setBorder(Rectangle.NO_BORDER);
            subtotalCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalsTable.addCell(subtotalCell);
            
            if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
                totalsTable.addCell(new Phrase("Montant payé:", normalFont));
                PdfPCell paidCell = new PdfPCell(new Phrase("-" + paidAmount + " " + currency, normalFont));
                paidCell.setBorder(Rectangle.NO_BORDER);
                paidCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                totalsTable.addCell(paidCell);
            }
            
            PdfPCell totalLabelCell = new PdfPCell(new Phrase("TOTAL:", boldFont));
            totalLabelCell.setBorder(Rectangle.TOP);
            totalLabelCell.setBorderColor(primaryColor);
            totalLabelCell.setBorderWidth(2);
            totalLabelCell.setPaddingTop(8);
            totalsTable.addCell(totalLabelCell);
            
            PdfPCell totalValCell = new PdfPCell(new Phrase(invoice.getTotalAmount() + " " + currency, new Font(Font.HELVETICA, 12, Font.BOLD, primaryColor)));
            totalValCell.setBorder(Rectangle.TOP);
            totalValCell.setBorderColor(primaryColor);
            totalValCell.setBorderWidth(2);
            totalValCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalValCell.setPaddingTop(8);
            totalsTable.addCell(totalValCell);
            
            if (balance.compareTo(BigDecimal.ZERO) > 0) {
                totalsTable.addCell(new Phrase("Reste à payer:", boldFont));
                PdfPCell balanceCell = new PdfPCell(new Phrase(balance + " " + currency, boldFont));
                balanceCell.setBorder(Rectangle.NO_BORDER);
                balanceCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                totalsTable.addCell(balanceCell);
            }
            
            PdfPCell totalsWrapper = new PdfPCell(totalsTable);
            totalsWrapper.setBorder(Rectangle.NO_BORDER);
            totalsMainTable.addCell(totalsWrapper);
            
            document.add(totalsMainTable);
            document.add(new Paragraph(" ", normalFont));
            document.add(new Paragraph(" ", normalFont));
            
            // ========== FOOTER ==========
            PdfPTable footerTable = new PdfPTable(1);
            footerTable.setWidthPercentage(100);
            
            PdfPCell footerCell = new PdfPCell();
            footerCell.setBorder(Rectangle.TOP);
            footerCell.setBorderColor(primaryColor);
            footerCell.setBorderWidth(1);
            footerCell.setPadding(15);
            
            // Watermark si activé
            if (enableWatermark && !documentWatermark.isEmpty()) {
                Paragraph watermarkPara = new Paragraph("[" + documentWatermark + "]", 
                    new Font(Font.HELVETICA, 9, Font.ITALIC, java.awt.Color.LIGHT_GRAY));
                watermarkPara.setAlignment(Element.ALIGN_CENTER);
                watermarkPara.setLeading(0, 1.2f);
                footerCell.addElement(watermarkPara);
            }
            
            Paragraph footerTextPara = new Paragraph(footerText, new Font(Font.HELVETICA, 10, Font.ITALIC, secondaryColor));
            footerTextPara.setAlignment(Element.ALIGN_CENTER);
            footerCell.addElement(footerTextPara);
            
            if (!hospitalName.isEmpty()) {
                Paragraph poweredBy = new Paragraph("- " + hospitalName + " -", smallFont);
                poweredBy.setAlignment(Element.ALIGN_CENTER);
                poweredBy.setLeading(0, 1.5f);
                footerCell.addElement(poweredBy);
            }
            
            // Zone de signature si activée
            if (enableSignature) {
                PdfPTable signatureTable = new PdfPTable(2);
                signatureTable.setWidthPercentage(100);
                signatureTable.setSpacingBefore(20);
                
                // Signature Client
                PdfPCell clientSigCell = new PdfPCell();
                clientSigCell.setBorder(Rectangle.NO_BORDER);
                Paragraph clientSig = new Paragraph("Signature Client", 
                    new Font(Font.HELVETICA, 9, Font.NORMAL, java.awt.Color.GRAY));
                clientSig.setLeading(0, 3f);
                clientSigCell.addElement(clientSig);
                Paragraph clientLine = new Paragraph("_______________________", 
                    new Font(Font.HELVETICA, 9, Font.NORMAL));
                clientSigCell.addElement(clientLine);
                signatureTable.addCell(clientSigCell);
                
                // Signature Établissement
                PdfPCell hospSigCell = new PdfPCell();
                hospSigCell.setBorder(Rectangle.NO_BORDER);
                hospSigCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                Paragraph hospSig = new Paragraph("Signature & Cachet", 
                    new Font(Font.HELVETICA, 9, Font.NORMAL, java.awt.Color.GRAY));
                hospSig.setAlignment(Element.ALIGN_RIGHT);
                hospSig.setLeading(0, 3f);
                hospSigCell.addElement(hospSig);
                Paragraph hospLine = new Paragraph("_______________________", 
                    new Font(Font.HELVETICA, 9, Font.NORMAL));
                hospLine.setAlignment(Element.ALIGN_RIGHT);
                hospSigCell.addElement(hospLine);
                signatureTable.addCell(hospSigCell);
                
                footerCell.addElement(signatureTable);
            }
            
            footerTable.addCell(footerCell);
            document.add(footerTable);
            
            document.close();
            
            byte[] pdfBytes = baos.toByteArray();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "Facture-" + (invoice.getInvoiceCode() != null ? invoice.getInvoiceCode() : id) + ".pdf");
            headers.setContentLength(pdfBytes.length);
            
            log.info("✅ [BILLING] PDF généré avec succès pour facture {} ({} bytes)", id, pdfBytes.length);
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
            
        } catch (Exception e) {
            log.error("❌ [BILLING] Erreur lors de la génération du PDF pour facture {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Génère un code de paiement unique court pour présentation au guichet
     * Format: P-XXXXXX (6 caractères alphanumériques)
     */
    private String generatePaymentCode(String referenceId) {
        String hash = Integer.toHexString(referenceId.hashCode()).toUpperCase();
        return "P-" + String.format("%06s", hash).substring(0, 6).replace(' ', '0');
    }
}
