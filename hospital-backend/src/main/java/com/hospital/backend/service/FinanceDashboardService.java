package com.hospital.backend.service;

import com.hospital.backend.dto.FinanceDashboardDTO;
import com.hospital.backend.entity.Currency;
import com.hospital.backend.entity.Expense;
import com.hospital.backend.entity.Revenue;
import com.hospital.backend.repository.ExpenseRepository;
import com.hospital.backend.repository.InvoiceRepository;
import com.hospital.backend.repository.RevenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Service pour générer les statistiques complètes du tableau de bord financier
 * avec séparation par devise (CDF et USD)
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FinanceDashboardService {

    private final RevenueRepository revenueRepository;
    private final ExpenseRepository expenseRepository;
    private final InvoiceRepository invoiceRepository;

    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("MMM yyyy", Locale.FRENCH);

    /**
     * Génère le tableau de bord financier complet avec toutes les statistiques
     */
    public FinanceDashboardDTO getDashboard() {
        log.info("📊 [DASHBOARD] Génération des statistiques financières...");

        FinanceDashboardDTO dto = new FinanceDashboardDTO();

        // ═══════════════════════════════════════════════════════════════
        // 1. REVENUS PAR DEVISE
        // ═══════════════════════════════════════════════════════════════

        dto.setDailyRevenue(FinanceDashboardDTO.CurrencyStats.of(
            revenueRepository.getTodayTotalByCurrency(Currency.CDF),
            revenueRepository.getTodayTotalByCurrency(Currency.USD)
        ));

        dto.setMonthlyRevenue(FinanceDashboardDTO.CurrencyStats.of(
            revenueRepository.getCurrentMonthTotalByCurrency(Currency.CDF),
            revenueRepository.getCurrentMonthTotalByCurrency(Currency.USD)
        ));

        dto.setTotalRevenue(FinanceDashboardDTO.CurrencyStats.of(
            revenueRepository.getTotalByCurrency(Currency.CDF),
            revenueRepository.getTotalByCurrency(Currency.USD)
        ));

        // ═══════════════════════════════════════════════════════════════
        // 2. DÉPENSES PAR DEVISE
        // ═══════════════════════════════════════════════════════════════

        dto.setDailyExpenses(FinanceDashboardDTO.CurrencyStats.of(
            expenseRepository.getTodayTotalByCurrency(Currency.CDF),
            expenseRepository.getTodayTotalByCurrency(Currency.USD)
        ));

        dto.setMonthlyExpenses(FinanceDashboardDTO.CurrencyStats.of(
            expenseRepository.getCurrentMonthTotalByCurrency(Currency.CDF),
            expenseRepository.getCurrentMonthTotalByCurrency(Currency.USD)
        ));

        dto.setTotalExpenses(FinanceDashboardDTO.CurrencyStats.of(
            expenseRepository.getTotalByCurrency(Currency.CDF),
            expenseRepository.getTotalByCurrency(Currency.USD)
        ));

        // ═══════════════════════════════════════════════════════════════
        // 3. SOLDE NET (Revenus - Dépenses)
        // ═══════════════════════════════════════════════════════════════

        dto.setNetBalance(FinanceDashboardDTO.CurrencyStats.of(
            dto.getTotalRevenue().getCdf().subtract(dto.getTotalExpenses().getCdf()),
            dto.getTotalRevenue().getUsd().subtract(dto.getTotalExpenses().getUsd())
        ));

        // ═══════════════════════════════════════════════════════════════
        // 4. STATISTIQUES COMPLÉMENTAIRES
        // ═══════════════════════════════════════════════════════════════

        dto.setPendingInvoicesCount(invoiceRepository.countByStatus("PENDING"));
        dto.setTotalInvoicesGenerated(invoiceRepository.count());
        dto.setTotalRevenuesCount(revenueRepository.count());
        dto.setTotalExpensesCount(expenseRepository.count());

        // ═══════════════════════════════════════════════════════════════
        // 5. RÉPARTITION PAR SOURCE (Revenus)
        // ═══════════════════════════════════════════════════════════════

        List<Object[]> revenueStats = revenueRepository.getStatsBySourceAndCurrency();
        dto.setRevenueBySource(buildSourceStats(revenueStats));

        // ═══════════════════════════════════════════════════════════════
        // 6. RÉPARTITION PAR CATÉGORIE (Dépenses)
        // ═══════════════════════════════════════════════════════════════

        List<Object[]> expenseStats = expenseRepository.getStatsByCategoryAndCurrency();
        dto.setExpensesByCategory(buildCategoryStats(expenseStats));

        // ═══════════════════════════════════════════════════════════════
        // 7. ÉVOLUTION MENSUELLE (6 derniers mois)
        // ═══════════════════════════════════════════════════════════════

        LocalDateTime sixMonthsAgo = LocalDateTime.now().minusMonths(6).withDayOfMonth(1).withHour(0).withMinute(0);
        dto.setRevenueEvolutionCDF(buildMonthlyEvolution(
            revenueRepository.getMonthlyEvolutionByCurrency(sixMonthsAgo, Currency.CDF)
        ));
        dto.setRevenueEvolutionUSD(buildMonthlyEvolution(
            revenueRepository.getMonthlyEvolutionByCurrency(sixMonthsAgo, Currency.USD)
        ));

        // ═══════════════════════════════════════════════════════════════
        // 8. TRANSACTIONS RÉCENTES
        // ═══════════════════════════════════════════════════════════════

        dto.setRecentTransactions(buildRecentTransactions());

        log.info("✅ [DASHBOARD] Statistiques générées avec succès");
        log.info("   📈 Revenus journaliers: {} CDF | {} USD", dto.getDailyRevenue().getCdf(), dto.getDailyRevenue().getUsd());
        log.info("   📉 Dépenses mensuelles: {} CDF | {} USD", dto.getMonthlyExpenses().getCdf(), dto.getMonthlyExpenses().getUsd());

        return dto;
    }

    /**
     * Construit les statistiques par source avec séparation CDF/USD
     */
    private List<FinanceDashboardDTO.SourceStats> buildSourceStats(List<Object[]> stats) {
        // Grouper par source
        return stats.stream()
            .collect(Collectors.groupingBy(
                row -> ((Revenue.RevenueSource) row[0]).name(),
                Collectors.toList()
            ))
            .entrySet()
            .stream()
            .map(entry -> {
                String source = entry.getKey();
                List<Object[]> rows = entry.getValue();

                BigDecimal cdfAmount = BigDecimal.ZERO;
                BigDecimal usdAmount = BigDecimal.ZERO;
                long totalCount = 0;

                for (Object[] row : rows) {
                    Currency currency = (Currency) row[1];
                    BigDecimal amount = (BigDecimal) row[2];
                    Long count = (Long) row[3];

                    if (currency == Currency.CDF) {
                        cdfAmount = amount;
                    } else {
                        usdAmount = amount;
                    }
                    totalCount += count;
                }

                return FinanceDashboardDTO.SourceStats.builder()
                    .source(source)
                    .amount(FinanceDashboardDTO.CurrencyStats.of(cdfAmount, usdAmount))
                    .count(totalCount)
                    .build();
            })
            .collect(Collectors.toList());
    }

    /**
     * Construit les statistiques par catégorie avec séparation CDF/USD
     */
    private List<FinanceDashboardDTO.CategoryStats> buildCategoryStats(List<Object[]> stats) {
        return stats.stream()
            .collect(Collectors.groupingBy(
                row -> ((Expense.ExpenseCategory) row[0]).name(),
                Collectors.toList()
            ))
            .entrySet()
            .stream()
            .map(entry -> {
                String category = entry.getKey();
                List<Object[]> rows = entry.getValue();

                BigDecimal cdfAmount = BigDecimal.ZERO;
                BigDecimal usdAmount = BigDecimal.ZERO;
                long totalCount = 0;

                for (Object[] row : rows) {
                    Currency currency = (Currency) row[1];
                    BigDecimal amount = (BigDecimal) row[2];
                    Long count = (Long) row[3];

                    if (currency == Currency.CDF) {
                        cdfAmount = amount;
                    } else {
                        usdAmount = amount;
                    }
                    totalCount += count;
                }

                return FinanceDashboardDTO.CategoryStats.builder()
                    .category(category)
                    .amount(FinanceDashboardDTO.CurrencyStats.of(cdfAmount, usdAmount))
                    .count(totalCount)
                    .build();
            })
            .collect(Collectors.toList());
    }

    /**
     * Construit l'évolution mensuelle à partir des résultats de requête
     */
    private List<FinanceDashboardDTO.MonthlyEvolution> buildMonthlyEvolution(List<Object[]> results) {
        return results.stream()
            .map(row -> {
                Integer year = (Integer) row[0];
                Integer month = (Integer) row[1];
                BigDecimal amount = (BigDecimal) row[2];

                String monthLabel = String.format("%s %d",
                    java.time.Month.of(month).getDisplayName(java.time.format.TextStyle.SHORT, Locale.FRENCH),
                    year
                );

                return FinanceDashboardDTO.MonthlyEvolution.builder()
                    .month(monthLabel)
                    .year(String.valueOf(year))
                    .amount(amount != null ? amount : BigDecimal.ZERO)
                    .build();
            })
            .collect(Collectors.toList());
    }

    /**
     * Construit la liste des transactions récentes (revenus et dépenses)
     */
    private List<FinanceDashboardDTO.RecentTransaction> buildRecentTransactions() {
        List<FinanceDashboardDTO.RecentTransaction> transactions = new ArrayList<>();

        // Récupérer les 5 revenus les plus récents
        List<Revenue> recentRevenues = revenueRepository.findRecentRevenues(
            org.springframework.data.domain.PageRequest.of(0, 5)
        );

        for (Revenue r : recentRevenues) {
            transactions.add(FinanceDashboardDTO.RecentTransaction.builder()
                .id(r.getId())
                .type("REVENUE")
                .description(r.getDescription())
                .amount(r.getAmount())
                .currency(r.getCurrency().name())
                .date(r.getDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .status("COMPLETED")
                .patientName(r.getReferenceInvoice() != null && r.getReferenceInvoice().getPatient() != null
                    ? r.getReferenceInvoice().getPatient().getFirstName() + " " + r.getReferenceInvoice().getPatient().getLastName()
                    : null)
                .build());
        }

        // Trier par date décroissante et limiter à 10
        return transactions.stream()
            .sorted((a, b) -> b.getDate().compareTo(a.getDate()))
            .limit(10)
            .collect(Collectors.toList());
    }
}
