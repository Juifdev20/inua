package com.hospital.backend.repository;

import com.hospital.backend.entity.Revenue;
import com.hospital.backend.entity.Revenue.RevenueSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RevenueRepository extends JpaRepository<Revenue, Long> {

    // Find by source with pagination
    Page<Revenue> findBySourceOrderByDateDesc(RevenueSource source, Pageable pageable);

    // Find by source without pagination
    List<Revenue> findBySourceOrderByDateDesc(RevenueSource source);

    // Recent revenues by user
    Page<Revenue> findByCreatedByIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    // Find by receipt number
    Optional<Revenue> findByReceiptNumber(String receiptNumber);

    // Find by reference invoice
    Optional<Revenue> findByReferenceInvoiceId(Long invoiceId);

    // Sum by period and source
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Revenue r WHERE r.date BETWEEN :startDate AND :endDate AND (:source IS NULL OR r.source = :source)")
    BigDecimal sumAmountByDateBetweenAndSource(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            @Param("source") RevenueSource source);

    // Daily total
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Revenue r WHERE CAST(r.date AS date) = CURRENT_DATE")
    BigDecimal getTodayTotal();

    // Monthly total
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Revenue r WHERE YEAR(r.date) = YEAR(CURRENT_DATE) AND MONTH(r.date) = MONTH(CURRENT_DATE)")
    BigDecimal getCurrentMonthTotal();

    // Total revenues between dates
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Revenue r WHERE r.date BETWEEN :start AND :end")
    BigDecimal sumAmountByDateBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // Stats by source
    @Query("SELECT r.source, COALESCE(SUM(r.amount), 0), COALESCE(COUNT(r), 0) FROM Revenue r GROUP BY r.source")
    List<Object[]> getStatsBySource();

    // Recent revenues (limit)
    @Query("SELECT r FROM Revenue r ORDER BY r.date DESC")
    List<Revenue> findRecentRevenues(Pageable pageable);

    // Sum by source
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Revenue r WHERE r.source = :source")
    BigDecimal sumAmountBySource(@Param("source") RevenueSource source);

    // Sum all amounts
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Revenue r")
    BigDecimal sumTotalAmount();

    // Sum by date
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Revenue r WHERE CAST(r.date AS date) = :date")
    BigDecimal sumAmountByDate(@Param("date") java.time.LocalDate date);

    // ═══════════════════════════════════════════════════════════════
    // TOTAUX PAR DEVISE (CDF / USD)
    // ═══════════════════════════════════════════════════════════════

    // Daily total by currency
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Revenue r WHERE CAST(r.date AS date) = :today AND r.currency = :currency")
    BigDecimal getTodayTotalByCurrency(@Param("today") java.time.LocalDate today, @Param("currency") com.hospital.backend.entity.Currency currency);

    // Monthly total by currency
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Revenue r WHERE YEAR(r.date) = YEAR(CURRENT_DATE) AND MONTH(r.date) = MONTH(CURRENT_DATE) AND r.currency = :currency")
    BigDecimal getCurrentMonthTotalByCurrency(@Param("currency") com.hospital.backend.entity.Currency currency);

    // Stats by source AND currency
    @Query("SELECT r.source, r.currency, COALESCE(SUM(r.amount), 0), COALESCE(COUNT(r), 0) FROM Revenue r GROUP BY r.source, r.currency")
    List<Object[]> getStatsBySourceAndCurrency();

    // Total all time by currency
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Revenue r WHERE r.currency = :currency")
    BigDecimal getTotalByCurrency(@Param("currency") com.hospital.backend.entity.Currency currency);

    // Evolution over last 6 months by currency
    @Query("SELECT YEAR(r.date), MONTH(r.date), COALESCE(SUM(r.amount), 0) FROM Revenue r WHERE r.date >= :startDate AND r.currency = :currency GROUP BY YEAR(r.date), MONTH(r.date) ORDER BY YEAR(r.date), MONTH(r.date)")
    List<Object[]> getMonthlyEvolutionByCurrency(@Param("startDate") LocalDateTime startDate, @Param("currency") com.hospital.backend.entity.Currency currency);
}
