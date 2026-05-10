package com.hospital.backend.repository;

import com.hospital.backend.entity.ExchangeRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {

    /**
     * ★ Récupère le taux actif pour une paire de devises spécifique
     */
    Optional<ExchangeRate> findByCurrencyFromAndCurrencyToAndIsActiveTrue(
            String currencyFrom, 
            String currencyTo
    );

    /**
     * ★ Récupère tous les taux actifs
     */
    List<ExchangeRate> findByIsActiveTrue();

    /**
     * ★ Récupère tous les taux pour une devise source
     */
    List<ExchangeRate> findByCurrencyFromAndIsActiveTrue(String currencyFrom);

    /**
     * ★ Vérifie si un taux existe pour une paire de devises
     */
    boolean existsByCurrencyFromAndCurrencyToAndIsActiveTrue(
            String currencyFrom, 
            String currencyTo
    );

    /**
     * ★ Récupère le taux USD vers FC (cas le plus courant)
     */
    @Query("SELECT er FROM ExchangeRate er WHERE er.currencyFrom = 'USD' AND er.currencyTo = 'FC' AND er.isActive = true")
    Optional<ExchangeRate> findUsdToFcRate();

    /**
     * ★ Recherche par description (pour la recherche textuelle)
     */
    @Query("SELECT er FROM ExchangeRate er WHERE er.isActive = true AND " +
           "(LOWER(er.description) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(er.currencyFrom) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(er.currencyTo) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<ExchangeRate> searchActiveRates(@Param("search") String search);
}
