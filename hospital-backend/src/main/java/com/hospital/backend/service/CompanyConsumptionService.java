package com.hospital.backend.service;

import com.hospital.backend.entity.Admission;
import com.hospital.backend.entity.Company;
import com.hospital.backend.entity.CompanyConsumptionRecord;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.repository.CompanyConsumptionRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Service dédié à l'enregistrement de la consommation des patients abonnés.
 * Appelé après chaque flux : CONSULTATION, LABO, PHARMACIE.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyConsumptionService {

    private final CompanyConsumptionRecordRepository recordRepository;

    /**
     * Enregistre la consommation d'un flux pour un patient abonné.
     * Appelé automatiquement après chaque service consommé.
     */
    @Transactional
    public CompanyConsumptionRecord record(
            Company company,
            Patient patient,
            Admission admission,
            CompanyConsumptionRecord.FluxType fluxType,
            String description,
            BigDecimal totalAmount,
            BigDecimal coverageRate) {

        if (company == null || patient == null) {
            log.warn("⚠️ Consommation ignorée : company ou patient null");
            return null;
        }

        BigDecimal rate = coverageRate != null ? coverageRate : new BigDecimal("100.00");
        BigDecimal companyCoverage;
        BigDecimal patientSurplus;

        if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) == 0) {
            companyCoverage = BigDecimal.ZERO;
            patientSurplus = BigDecimal.ZERO;
        } else if (rate.compareTo(new BigDecimal("100")) >= 0) {
            companyCoverage = totalAmount;
            patientSurplus = BigDecimal.ZERO;
        } else {
            companyCoverage = totalAmount.multiply(rate)
                    .divide(new BigDecimal("100"), 2, BigDecimal.ROUND_HALF_UP);
            patientSurplus = totalAmount.subtract(companyCoverage);
        }

        CompanyConsumptionRecord record = CompanyConsumptionRecord.builder()
                .company(company)
                .patient(patient)
                .admission(admission)
                .matricule(admission != null ? admission.getMatricule() : null)
                .fluxType(fluxType)
                .description(description)
                .totalAmount(totalAmount != null ? totalAmount : BigDecimal.ZERO)
                .companyCoverage(companyCoverage)
                .patientSurplus(patientSurplus)
                .coverageRate(rate)
                .consumedAt(LocalDateTime.now())
                .build();

        CompanyConsumptionRecord saved = recordRepository.save(record);
        log.info("📋 Consommation enregistrée - {} | {} | patient={} | total={} | company={} | surplus={}",
                fluxType, company.getName(), patient.getId(), totalAmount, companyCoverage, patientSurplus);
        return saved;
    }
}
