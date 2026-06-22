package com.hospital.backend.repository;

import com.hospital.backend.entity.Company;
import com.hospital.backend.entity.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {

    List<Company> findBySubscriptionStatus(SubscriptionStatus status);

    List<Company> findAllByOrderByNameAsc();

    // ── Optimisation pour éviter OOM dans getAllCompaniesStats ─────────────────────
    List<Company> findBySubscriptionStatusOrderByCreatedAtDesc(SubscriptionStatus status);

    Optional<Company> findByContractNumber(String contractNumber);

    boolean existsByContractNumber(String contractNumber);

    boolean existsByNameIgnoreCase(String name);

    // ★ MULTI-TENANT: filtrer par hôpital
    List<Company> findByHospitalIdOrderByNameAsc(Long hospitalId);
    List<Company> findByHospitalIdAndSubscriptionStatus(Long hospitalId, SubscriptionStatus status);
    List<Company> findByHospitalIdAndSubscriptionStatusOrderByCreatedAtDesc(Long hospitalId, SubscriptionStatus status);
}
