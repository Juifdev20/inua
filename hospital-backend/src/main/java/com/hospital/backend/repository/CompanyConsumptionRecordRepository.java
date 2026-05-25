package com.hospital.backend.repository;

import com.hospital.backend.entity.CompanyConsumptionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface CompanyConsumptionRecordRepository extends JpaRepository<CompanyConsumptionRecord, Long> {

    List<CompanyConsumptionRecord> findByCompanyIdAndConsumedAtBetweenOrderByConsumedAtDesc(
            Long companyId, LocalDateTime start, LocalDateTime end);

    List<CompanyConsumptionRecord> findByAdmissionId(Long admissionId);

    @Query("SELECT COALESCE(SUM(r.companyCoverage), 0) FROM CompanyConsumptionRecord r " +
           "WHERE r.company.id = :companyId AND r.consumedAt BETWEEN :start AND :end")
    BigDecimal sumCompanyCoverageByCompanyAndPeriod(
            @Param("companyId") Long companyId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(SUM(r.patientSurplus), 0) FROM CompanyConsumptionRecord r " +
           "WHERE r.company.id = :companyId AND r.consumedAt BETWEEN :start AND :end")
    BigDecimal sumPatientSurplusByCompanyAndPeriod(
            @Param("companyId") Long companyId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    long countByCompanyIdAndConsumedAtBetween(
            Long companyId, LocalDateTime start, LocalDateTime end);

    List<CompanyConsumptionRecord> findByCompanyIdAndPatientIdAndFluxTypeAndConsumedAtBetween(
            Long companyId, Long patientId,
            CompanyConsumptionRecord.FluxType fluxType,
            LocalDateTime start, LocalDateTime end);
}
