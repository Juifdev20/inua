package com.hospital.backend.service;

import com.hospital.backend.entity.ExchangeRate;
import com.hospital.backend.repository.ExchangeRateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

/**
 * ★ SERVICE: Gestion des taux de change
 * Permet de gérer les taux de conversion entre devises
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExchangeRateService {

    private final ExchangeRateRepository exchangeRateRepository;

    // ★ Taux par défaut si aucun taux n'est configuré
    private static final BigDecimal DEFAULT_USD_TO_FC_RATE = new BigDecimal("2800");

    /**
     * ★ Récupère tous les taux actifs
     */
    public List<ExchangeRate> getAllActiveRates() {
        return exchangeRateRepository.findByIsActiveTrue();
    }

    /**
     * ★ Récupère un taux par son ID
     */
    public Optional<ExchangeRate> getRateById(Long id) {
        return exchangeRateRepository.findById(id);
    }

    /**
     * ★ Récupère le taux pour une paire de devises spécifique
     */
    public Optional<ExchangeRate> getRate(String currencyFrom, String currencyTo) {
        return exchangeRateRepository.findByCurrencyFromAndCurrencyToAndIsActiveTrue(
                currencyFrom, currencyTo
        );
    }

    /**
     * ★ Récupère le taux USD vers FC (cas le plus courant)
     * Retourne le taux configuré ou le taux par défaut (2800)
     */
    public BigDecimal getUsdToFcRate() {
        Optional<ExchangeRate> rate = exchangeRateRepository.findUsdToFcRate();
        if (rate.isPresent()) {
            log.info("💱 Taux USD/FC récupéré de la base: {}", rate.get().getRate());
            return rate.get().getRate();
        }
        log.warn("⚠️ Aucun taux USD/FC configuré, utilisation du taux par défaut: {}", DEFAULT_USD_TO_FC_RATE);
        return DEFAULT_USD_TO_FC_RATE;
    }

    /**
     * ★ Crée ou met à jour un taux de change
     */
    @Transactional
    public ExchangeRate saveRate(ExchangeRate rate, Long userId, String userName) {
        // Vérifier si un taux existe déjà pour cette paire
        Optional<ExchangeRate> existingRate = exchangeRateRepository
                .findByCurrencyFromAndCurrencyToAndIsActiveTrue(
                        rate.getCurrencyFrom(), 
                        rate.getCurrencyTo()
                );

        if (existingRate.isPresent() && !existingRate.get().getId().equals(rate.getId())) {
            // Désactiver l'ancien taux
            ExchangeRate oldRate = existingRate.get();
            oldRate.setIsActive(false);
            exchangeRateRepository.save(oldRate);
            log.info("🔄 Ancien taux {}/{} désactivé (ID: {})", 
                    oldRate.getCurrencyFrom(), oldRate.getCurrencyTo(), oldRate.getId());
        }

        // Mettre à jour les informations
        rate.setUpdatedBy(userId);
        rate.setUpdatedByName(userName);
        rate.setIsActive(true);

        ExchangeRate saved = exchangeRateRepository.save(rate);
        log.info("💾 Taux de change sauvegardé: {} = {} (par: {})", 
                saved.getCurrencyPair(), saved.getRate(), userName);

        return saved;
    }

    /**
     * ★ Désactive un taux (suppression logique)
     */
    @Transactional
    public void deactivateRate(Long id, Long userId, String userName) {
        ExchangeRate rate = exchangeRateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Taux non trouvé avec l'ID: " + id));

        rate.setIsActive(false);
        rate.setUpdatedBy(userId);
        rate.setUpdatedByName(userName);
        exchangeRateRepository.save(rate);

        log.info("🚫 Taux désactivé: {} (par: {})", rate.getCurrencyPair(), userName);
    }

    /**
     * ★ Initialise le taux par défaut USD/FC si aucun n'existe
     */
    @Transactional
    public void initializeDefaultRate(Long userId, String userName) {
        if (!exchangeRateRepository.existsByCurrencyFromAndCurrencyToAndIsActiveTrue("USD", "FC")) {
            ExchangeRate defaultRate = ExchangeRate.builder()
                    .currencyFrom("USD")
                    .currencyTo("FC")
                    .rate(DEFAULT_USD_TO_FC_RATE)
                    .description("Taux par défaut USD vers Francs Congolais")
                    .isActive(true)
                    .updatedBy(userId)
                    .updatedByName(userName)
                    .build();

            exchangeRateRepository.save(defaultRate);
            log.info("🆕 Taux par défaut USD/FC créé: {}", DEFAULT_USD_TO_FC_RATE);
        }
    }

    /**
     * ★ Convertit un montant d'une devise à une autre
     */
    public BigDecimal convert(BigDecimal amount, String from, String to) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        // Si même devise, pas de conversion
        if (from.equalsIgnoreCase(to)) {
            return amount;
        }

        // Récupérer le taux
        Optional<ExchangeRate> rate = getRate(from, to);
        if (rate.isPresent()) {
            return amount.multiply(rate.get().getRate());
        }

        // Si pas de taux direct, essayer l'inverse
        Optional<ExchangeRate> inverseRate = getRate(to, from);
        if (inverseRate.isPresent()) {
            return amount.divide(inverseRate.get().getRate(), 6, RoundingMode.HALF_UP);
        }

        // Taux par défaut pour USD/FC
        if (from.equalsIgnoreCase("USD") && to.equalsIgnoreCase("FC")) {
            return amount.multiply(DEFAULT_USD_TO_FC_RATE);
        }
        if (from.equalsIgnoreCase("FC") && to.equalsIgnoreCase("USD")) {
            return amount.divide(DEFAULT_USD_TO_FC_RATE, 6, RoundingMode.HALF_UP);
        }

        log.warn("⚠️ Aucun taux trouvé pour {}/{}, conversion impossible", from, to);
        return amount; // Retourne le montant original
    }
}
