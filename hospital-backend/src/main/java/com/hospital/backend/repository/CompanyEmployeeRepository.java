package com.hospital.backend.repository;

import com.hospital.backend.entity.CompanyEmployee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyEmployeeRepository extends JpaRepository<CompanyEmployee, Long> {

    List<CompanyEmployee> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    Optional<CompanyEmployee> findByCompanyIdAndPatientId(Long companyId, Long patientId);

    Optional<CompanyEmployee> findFirstByPatientIdAndIsActiveTrue(Long patientId);

    boolean existsByPatientIdAndIsActiveTrue(Long patientId);

    @Query("SELECT e FROM CompanyEmployee e WHERE e.company.id = :companyId AND " +
            "(LOWER(e.matricule) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            " LOWER(e.patient.firstName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            " LOWER(e.patient.lastName) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<CompanyEmployee> searchByCompany(@Param("companyId") Long companyId, @Param("query") String query);
}
