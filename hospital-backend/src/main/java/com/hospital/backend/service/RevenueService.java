package com.hospital.backend.service;

import com.hospital.backend.dto.RevenueDTO;
import com.hospital.backend.entity.Revenue.RevenueSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface RevenueService {

    // CRUD
    RevenueDTO createRevenue(RevenueDTO dto, Long userId);

    RevenueDTO updateRevenue(Long id, RevenueDTO dto);

    RevenueDTO getRevenueById(Long id);

    void deleteRevenue(Long id);

    // Listings
    Page<RevenueDTO> getAllRevenues(Pageable pageable);

    Page<RevenueDTO> getRevenuesBySource(RevenueSource source, Pageable pageable);

    List<RevenueDTO> getRecentRevenuesByUser(Long userId, int limit);

    List<RevenueDTO> getRecentRevenues(int limit);

    // Statistics
    BigDecimal getTotalRevenuesBetween(LocalDateTime start, LocalDateTime end);

    BigDecimal getTotalRevenuesBySourceAndPeriod(RevenueSource source, LocalDateTime start, LocalDateTime end);

    BigDecimal getTodayTotal();

    BigDecimal getMonthlyTotal();

    List<Object[]> getRevenuesStatsBySource();

    // Dashboard summary
    Map<String, Object> getDashboardSummary();

    // Auto-create from invoice payment
    RevenueDTO createRevenueFromInvoice(Long invoiceId, Long userId);
}
