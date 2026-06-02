package com.hospital.backend.service;

import com.hospital.backend.dto.CompanyEmployeeRequest;
import com.hospital.backend.dto.CompanyEmployeeResponse;
import com.hospital.backend.dto.CompanyRequest;
import com.hospital.backend.dto.CompanyResponse;
import com.hospital.backend.dto.CompanyStatsDTO;
import com.hospital.backend.dto.ConsumptionRecordDTO;
import com.hospital.backend.dto.PatientConsumptionSummaryDTO;
import com.hospital.backend.entity.SubscriptionStatus;

import java.util.List;

/**
 * Service de gestion des entreprises abonnées et de leurs agents.
 */
public interface CompanyService {

    List<CompanyResponse> getAllCompanies();

    List<CompanyResponse> getCompaniesByStatus(SubscriptionStatus status);

    CompanyResponse getCompanyById(Long id);

    CompanyResponse createCompany(CompanyRequest request);

    CompanyResponse updateCompany(Long id, CompanyRequest request);

    void deleteCompany(Long id);

    // --- Agents ---

    List<CompanyEmployeeResponse> getEmployeesByCompany(Long companyId);

    CompanyEmployeeResponse addEmployee(Long companyId, CompanyEmployeeRequest request);

    void deleteEmployee(Long companyId, Long employeeId);

    /** Retourne l'enregistrement d'agent actif pour un patient donné, ou null. */
    CompanyEmployeeResponse findActiveEmployeeByPatient(Long patientId);

    // --- Rapports & PDF ---

    /**
     * Génère la feuille de consommation mensuelle (PDF) pour une entreprise.
     *
     * @param companyId ID de l'entreprise
     * @param yearMonth format "yyyy-MM"
     * @return contenu PDF en byte[]
     */
    byte[] generateMonthlyConsumptionSheet(Long companyId, String yearMonth);

    /**
     * Statistiques agrégées d'une entreprise (Slice 2).
     */
    CompanyStatsDTO getCompanyStats(Long companyId);

    /**
     * Statistiques de toutes les entreprises abonnées pour un mois donné.
     *
     * @param yearMonth format "yyyy-MM", null = mois courant
     */
    List<CompanyStatsDTO> getAllCompaniesStats(String yearMonth);

    /**
     * Liste détaillée des enregistrements de consommation pour un mois donné.
     *
     * @param companyId ID de l'entreprise
     * @param yearMonth format "yyyy-MM"
     */
    List<ConsumptionRecordDTO> getConsumptionRecords(Long companyId, String yearMonth);

    /**
     * Résumé de consommation par patient (base = admissions) pour un mois donné.
     * Chaque ligne représente une admission avec les montants CONSULTATION/LABO/PHARMACIE.
     * Les flux non encore consommés apparaissent avec 0.
     */
    List<PatientConsumptionSummaryDTO> getPatientConsumptionSummaries(Long companyId, String yearMonth);
}
