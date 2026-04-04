package com.hospital.backend.repository;

import com.hospital.backend.entity.PharmacyOrder;
import com.hospital.backend.entity.PharmacyOrderStatus;
import com.hospital.backend.entity.PharmacyOrderType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PharmacyOrderRepository extends JpaRepository<PharmacyOrder, Long> {
    
    Optional<PharmacyOrder> findByOrderCode(String orderCode);
    
    List<PharmacyOrder> findByStatus(PharmacyOrderStatus status);
    
    List<PharmacyOrder> findByStatusIn(List<PharmacyOrderStatus> statuses);
    
    List<PharmacyOrder> findByPatientId(Long patientId);
    
    List<PharmacyOrder> findBySupplierId(Long supplierId);
    
    List<PharmacyOrder> findByOrderType(PharmacyOrderType orderType);
    
    Page<PharmacyOrder> findByStatusIn(List<PharmacyOrderStatus> statuses, Pageable pageable);
    
    @Query("SELECT o FROM PharmacyOrder o WHERE " +
           "LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(o.patient.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(o.patient.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(o.notes) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<PharmacyOrder> searchOrders(@Param("search") String search, Pageable pageable);
    
    @Query("SELECT COUNT(o) FROM PharmacyOrder o WHERE o.status = :status")
    Long countByStatus(@Param("status") PharmacyOrderStatus status);
    
    @Query("SELECT o FROM PharmacyOrder o WHERE o.status IN :statuses AND o.createdAt >= :since")
    List<PharmacyOrder> findRecentOrdersByStatus(@Param("statuses") List<PharmacyOrderStatus> statuses, 
                                                @Param("since") LocalDateTime since);
    
    // Dashboard method - includes ALL sales (archived and non-archived)
    @Query("SELECT o FROM PharmacyOrder o WHERE o.status IN :statuses AND o.createdAt >= :since")
    List<PharmacyOrder> findAllOrdersForDashboard(@Param("statuses") List<PharmacyOrderStatus> statuses, 
                                                  @Param("since") LocalDateTime since);
    
    @Query("SELECT o FROM PharmacyOrder o WHERE o.status = 'EN_ATTENTE' ORDER BY o.createdAt ASC")
    List<PharmacyOrder> findPendingOrders();
    
    @Query("SELECT o FROM PharmacyOrder o WHERE o.totalAmount > o.amountPaid AND o.status NOT IN ('ANNULEE', 'LIVREE')")
    List<PharmacyOrder> findUnpaidOrders();
    
    @Query("SELECT COUNT(o) FROM PharmacyOrder o WHERE o.createdAt >= :startDate AND o.createdAt <= :endDate")
    Long countOrdersByDateRange(@Param("startDate") LocalDateTime startDate, 
                                @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT o FROM PharmacyOrder o WHERE o.orderType = :orderType AND o.createdAt >= :startDate AND o.createdAt <= :endDate ORDER BY o.createdAt DESC")
    Page<PharmacyOrder> findByOrderTypeAndDateRange(@Param("orderType") PharmacyOrderType orderType,
                                                    @Param("startDate") LocalDateTime startDate,
                                                    @Param("endDate") LocalDateTime endDate,
                                                    Pageable pageable);
    
    @Query("SELECT o FROM PharmacyOrder o WHERE o.status IN ('PAYEE', 'LIVREE') AND o.createdAt >= :startDate AND o.createdAt <= :endDate ORDER BY o.createdAt DESC")
    Page<PharmacyOrder> findSalesHistory(@Param("startDate") LocalDateTime startDate,
                                         @Param("endDate") LocalDateTime endDate,
                                         Pageable pageable);
    
    // Archiving methods
    List<PharmacyOrder> findByArchivedFalse();
    
    List<PharmacyOrder> findByArchivedTrue();
    
    // Paginated version for archived sales
    Page<PharmacyOrder> findByArchivedTrue(Pageable pageable);
    
    @Query("SELECT o FROM PharmacyOrder o WHERE o.archived = false AND o.status IN ('PAYEE', 'LIVREE') AND o.createdAt >= :startDate AND o.createdAt <= :endDate ORDER BY o.createdAt DESC")
    Page<PharmacyOrder> findActiveSalesHistory(@Param("startDate") LocalDateTime startDate,
                                               @Param("endDate") LocalDateTime endDate,
                                               Pageable pageable);
    
    // ═════════════════════════════════════════════════════════════════
    // RAPPORTS - Report Queries
    // ═════════════════════════════════════════════════════════════════
    
    /**
     * Récupère les commandes payées/délivrées dans une période donnée
     * Utilisé pour les rapports de ventes
     */
    @Query("SELECT o FROM PharmacyOrder o WHERE o.status IN :statuses AND o.createdAt >= :startDate AND o.createdAt <= :endDate")
    List<PharmacyOrder> findByCreatedAtBetweenAndStatusIn(@Param("startDate") LocalDateTime startDate,
                                                          @Param("endDate") LocalDateTime endDate,
                                                          @Param("statuses") List<PharmacyOrderStatus> statuses);
}
