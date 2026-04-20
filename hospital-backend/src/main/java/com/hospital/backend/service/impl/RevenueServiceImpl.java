package com.hospital.backend.service.impl;

import com.hospital.backend.dto.RevenueDTO;
import com.hospital.backend.entity.Currency;
import com.hospital.backend.entity.Invoice;
import com.hospital.backend.entity.Revenue;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.InvoiceRepository;
import com.hospital.backend.repository.RevenueRepository;
import com.hospital.backend.service.RevenueService;
import com.hospital.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RevenueServiceImpl implements RevenueService {

    private final RevenueRepository revenueRepository;
    private final UserService userService;
    private final InvoiceRepository invoiceRepository;

    @Override
    public RevenueDTO createRevenue(RevenueDTO dto, Long userId) {
        log.info("Creating revenue for userId: {}, source: {}, amount: {}", userId, dto.getSource(), dto.getAmount());

        User createdBy = userService.findById(userId);
        Revenue revenue = dto.toEntity();
        revenue.setCreatedBy(createdBy);

        Revenue saved = revenueRepository.save(revenue);
        log.info("Revenue created with ID: {}, receipt: {}", saved.getId(), saved.getReceiptNumber());

        return RevenueDTO.fromEntity(saved);
    }

    @Override
    public RevenueDTO createRevenueFromInvoice(Long invoiceId, Long userId) {
        log.info("Auto-creating revenue from invoice ID: {}", invoiceId);

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found: " + invoiceId));

        // Check if revenue already exists for this invoice
        revenueRepository.findByReferenceInvoiceId(invoiceId).ifPresent(r -> {
            throw new RuntimeException("Revenue already exists for invoice: " + invoiceId);
        });

        User createdBy = userService.findById(userId);

        Revenue.RevenueSource source = mapDepartmentToSource(invoice.getDepartmentSource());

        Revenue revenue = Revenue.builder()
                .date(LocalDateTime.now())
                .amount(invoice.getPaidAmount() != null ? invoice.getPaidAmount() : invoice.getTotalAmount())
                .source(source)
                .paymentMethod(invoice.getPaymentMethod())
                .currency(Currency.USD)  // Par défaut en USD
                .referenceInvoice(invoice)
                .description("Paiement facture " + invoice.getInvoiceCode())
                .createdBy(createdBy)
                .build();

        Revenue saved = revenueRepository.save(revenue);
        log.info("Auto-created revenue from invoice: ID={}, Receipt={}", saved.getId(), saved.getReceiptNumber());

        return RevenueDTO.fromEntity(saved);
    }

    private Revenue.RevenueSource mapDepartmentToSource(com.hospital.backend.entity.DepartmentSource dept) {
        if (dept == null) return Revenue.RevenueSource.AUTRE;
        return switch (dept) {
            case RECEPTION -> Revenue.RevenueSource.ADMISSION;
            case DOCTOR -> Revenue.RevenueSource.CONSULTATION;
            case LABORATORY -> Revenue.RevenueSource.LABORATOIRE;
            case PHARMACY -> Revenue.RevenueSource.PHARMACIE;
            default -> Revenue.RevenueSource.AUTRE;
        };
    }

    @Override
    public RevenueDTO updateRevenue(Long id, RevenueDTO dto) {
        Revenue existing = revenueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Revenue not found: " + id));

        // Only allow updating description and amount (not receipt number or date)
        existing.setAmount(dto.getAmount());
        existing.setDescription(dto.getDescription());
        existing.setSource(dto.getSource());
        existing.setPaymentMethod(dto.getPaymentMethod());

        Revenue updated = revenueRepository.save(existing);
        log.info("Revenue updated: ID={}", updated.getId());

        return RevenueDTO.fromEntity(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public RevenueDTO getRevenueById(Long id) {
        Revenue revenue = revenueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Revenue not found: " + id));
        return RevenueDTO.fromEntity(revenue);
    }

    @Override
    public void deleteRevenue(Long id) {
        if (!revenueRepository.existsById(id)) {
            throw new RuntimeException("Revenue not found: " + id);
        }
        revenueRepository.deleteById(id);
        log.info("Revenue deleted: ID={}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RevenueDTO> getAllRevenues(Pageable pageable) {
        return revenueRepository.findAll(pageable)
                .map(RevenueDTO::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RevenueDTO> getRevenuesBySource(Revenue.RevenueSource source, Pageable pageable) {
        return revenueRepository.findBySourceOrderByDateDesc(source, pageable)
                .map(RevenueDTO::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RevenueDTO> getRecentRevenuesByUser(Long userId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return revenueRepository.findByCreatedByIdOrderByCreatedAtDesc(userId, pageable)
                .map(RevenueDTO::fromEntity)
                .getContent();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RevenueDTO> getRecentRevenues(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return revenueRepository.findRecentRevenues(pageable)
                .stream()
                .map(RevenueDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getTotalRevenuesBetween(LocalDateTime start, LocalDateTime end) {
        return revenueRepository.sumAmountByDateBetween(start, end);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getTotalRevenuesBySourceAndPeriod(Revenue.RevenueSource source, LocalDateTime start, LocalDateTime end) {
        return revenueRepository.sumAmountByDateBetweenAndSource(start, end, source);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getTodayTotal() {
        return revenueRepository.getTodayTotal();
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getMonthlyTotal() {
        return revenueRepository.getCurrentMonthTotal();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Object[]> getRevenuesStatsBySource() {
        return revenueRepository.getStatsBySource();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardSummary() {
        BigDecimal todayRevenue = getTodayTotal();
        BigDecimal monthlyRevenue = getMonthlyTotal();
        List<Object[]> statsBySource = getRevenuesStatsBySource();

        Map<String, Object> summary = new HashMap<>();
        summary.put("todayRevenue", todayRevenue);
        summary.put("monthlyRevenue", monthlyRevenue);
        summary.put("statsBySource", statsBySource);
        summary.put("currency", "CDF");

        return summary;
    }
}
