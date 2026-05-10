package com.hospital.backend.repository;

import com.hospital.backend.entity.PharmacyOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface PharmacyOrderItemRepository extends JpaRepository<PharmacyOrderItem, Long> {
    
    List<PharmacyOrderItem> findByPharmacyOrderId(Long pharmacyOrderId);
    
    List<PharmacyOrderItem> findByMedicationId(Long medicationId);
    
    @Query("SELECT i FROM PharmacyOrderItem i WHERE i.pharmacyOrder.id = :orderId AND i.quantity > i.quantityDispensed")
    List<PharmacyOrderItem> findUndispensedItems(@Param("orderId") Long orderId);
    
    @Query("SELECT i FROM PharmacyOrderItem i WHERE i.medication.id = :medicationId AND i.pharmacyOrder.status NOT IN ('ANNULEE', 'LIVREE')")
    List<PharmacyOrderItem> findActiveItemsByMedication(@Param("medicationId") Long medicationId);
    
    @Query("SELECT SUM(i.quantity) FROM PharmacyOrderItem i WHERE i.medication.id = :medicationId AND i.pharmacyOrder.status NOT IN ('ANNULEE')")
    Integer getTotalQuantityByMedication(@Param("medicationId") Long medicationId);
    
    @Query("SELECT SUM(i.quantityDispensed) FROM PharmacyOrderItem i WHERE i.medication.id = :medicationId AND i.pharmacyOrder.status IN ('LIVREE', 'PARTIELLEMENT_LIVREE')")
    Integer getTotalDispensedByMedication(@Param("medicationId") Long medicationId);
    
    /**
     * ═════════════════════════════════════════════════════════════════
     * PRÉDICTIONS - Requêtes pour le réapprovisionnement prédictif
     * ═════════════════════════════════════════════════════════════════
     * 
     * Récupère la quantité totale délivrée pour un médicament
     * dans une période donnée, pour calculer la CMM.
     * 
     * @param medicationId ID du médicament
     * @param startDate Date de début de la période
     * @param endDate Date de fin de la période
     * @return Quantité totale délivrée
     */
    @Query("SELECT COALESCE(SUM(i.quantityDispensed), 0) FROM PharmacyOrderItem i " +
           "WHERE i.medication.id = :medicationId " +
           "AND i.pharmacyOrder.status IN ('PAYEE', 'LIVREE', 'PARTIELLEMENT_LIVREE', 'PARTIELLEMENT_PAYEE') " +
           "AND i.pharmacyOrder.createdAt BETWEEN :startDate AND :endDate")
    Integer getTotalDispensedByMedicationAndDateRange(
            @Param("medicationId") Long medicationId,
            @Param("startDate") java.time.LocalDateTime startDate,
            @Param("endDate") java.time.LocalDateTime endDate);
    
    /**
     * Récupère l'historique des consommations mensuelles pour un médicament
     * Utilisé pour une analyse plus fine de la tendance
     */
    @Query("SELECT NEW map( " +
           "  MONTH(i.pharmacyOrder.createdAt) as month, " +
           "  YEAR(i.pharmacyOrder.createdAt) as year, " +
           "  SUM(i.quantityDispensed) as total) " +
           "FROM PharmacyOrderItem i " +
           "WHERE i.medication.id = :medicationId " +
           "AND i.pharmacyOrder.status IN ('PAYEE', 'LIVREE', 'PARTIELLEMENT_LIVREE', 'PARTIELLEMENT_PAYEE') " +
           "AND i.pharmacyOrder.createdAt >= :since " +
           "GROUP BY YEAR(i.pharmacyOrder.createdAt), MONTH(i.pharmacyOrder.createdAt) " +
           "ORDER BY YEAR(i.pharmacyOrder.createdAt) DESC, MONTH(i.pharmacyOrder.createdAt) DESC")
    List<Map<String, Object>> getMonthlyConsumptionHistory(
            @Param("medicationId") Long medicationId,
            @Param("since") java.time.LocalDateTime since);
}
