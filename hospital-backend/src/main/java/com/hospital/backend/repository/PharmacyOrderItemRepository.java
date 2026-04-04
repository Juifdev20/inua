package com.hospital.backend.repository;

import com.hospital.backend.entity.PharmacyOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

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
}
