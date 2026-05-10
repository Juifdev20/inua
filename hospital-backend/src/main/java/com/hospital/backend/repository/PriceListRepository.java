package com.hospital.backend.repository;

import com.hospital.backend.entity.PriceList;
import com.hospital.backend.entity.PriceListType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PriceListRepository extends JpaRepository<PriceList, Long> {

    /**
     * Trouve le prix actif pour un type de service à une date donnée
     */
    @Query("SELECT p FROM PriceList p WHERE p.serviceType = :type " +
            "AND p.isActive = true " +
            "AND (p.validFrom IS NULL OR p.validFrom <= :date) " +
            "AND (p.validUntil IS NULL OR p.validUntil >= :date) " +
            "ORDER BY p.validFrom DESC")
    Optional<PriceList> findActivePriceByType(@Param("type") PriceListType type, @Param("date") LocalDateTime date);

    /**
     * Trouve tous les prix actifs
     */
    @Query("SELECT p FROM PriceList p WHERE p.isActive = true " +
            "AND (p.validFrom IS NULL OR p.validFrom <= CURRENT_TIMESTAMP) " +
            "AND (p.validUntil IS NULL OR p.validUntil >= CURRENT_TIMESTAMP)")
    List<PriceList> findAllActivePrices();

    /**
     * Trouve tous les prix actifs pour un département
     */
    @Query("SELECT p FROM PriceList p WHERE p.isActive = true " +
            "AND p.department.id = :departmentId " +
            "AND (p.validFrom IS NULL OR p.validFrom <= CURRENT_TIMESTAMP) " +
            "AND (p.validUntil IS NULL OR p.validUntil >= CURRENT_TIMESTAMP)")
    List<PriceList> findActivePricesByDepartment(@Param("departmentId") Long departmentId);

    /**
     * Recherche par nom (pour l'auto-complétion)
     */
    @Query("SELECT p FROM PriceList p WHERE p.nom LIKE %:query% AND p.isActive = true")
    List<PriceList> searchByName(@Param("query") String query);
}

