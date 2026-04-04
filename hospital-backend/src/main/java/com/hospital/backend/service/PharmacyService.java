package com.hospital.backend.service;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.PharmacyOrderStatus;
import com.hospital.backend.entity.PharmacyOrderType;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface PharmacyService {
    
    // Order Management
    PharmacyOrderDTO createOrder(PharmacyOrderDTO orderDTO);
    PharmacyOrderDTO updateOrder(Long id, PharmacyOrderDTO orderDTO);
    PharmacyOrderDTO getOrderById(Long id);
    PharmacyOrderDTO getOrderByCode(String orderCode);
    PageResponse<PharmacyOrderDTO> getOrdersByStatus(List<PharmacyOrderStatus> statuses, Pageable pageable);
    PageResponse<PharmacyOrderDTO> searchOrders(String query, Pageable pageable);
    List<PharmacyOrderDTO> getPendingOrders();
    
    // Sales History
    PageResponse<PharmacyOrderDTO> getSalesHistory(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable, Boolean archived);
    
    // Order Status Management
    PharmacyOrderDTO updateOrderStatus(Long id, PharmacyOrderStatus status);
    PharmacyOrderDTO processPayment(Long orderId, BigDecimal amountPaid, String paymentMethod);
    PharmacyOrderDTO processPayment(Long orderId, BigDecimal amountPaid, String paymentMethod, Boolean allowPartialPayment);
    PharmacyOrderDTO dispenseOrder(Long orderId, Long pharmacistId);
    
    // Stock Management
    boolean checkMedicationStock(Long medicationId, Integer requiredQuantity);
    void updateMedicationStock(Long medicationId, Integer quantityChange);
    List<PharmacyOrderDTO> getUnpaidOrders();
    
    // Supplier Management
    SupplierDTO createSupplier(SupplierDTO supplierDTO);
    SupplierDTO updateSupplier(Long id, SupplierDTO supplierDTO);
    SupplierDTO getSupplierById(Long id);
    List<SupplierDTO> getActiveSuppliers();
    PageResponse<SupplierDTO> searchSuppliers(String query, Pageable pageable);
    
    // Dashboard Statistics
    PharmacyDashboardStatsDTO getDashboardStats();
    
    // Order Items
    PharmacyOrderItemDTO addOrderItem(Long orderId, PharmacyOrderItemDTO itemDTO);
    PharmacyOrderItemDTO updateOrderItem(Long itemId, PharmacyOrderItemDTO itemDTO);
    void removeOrderItem(Long itemId);
    
    // Stock Alerts
    List<MedicationStockAlertDTO> getStockAlerts();
    
    // Order Validation
    PharmacyOrderDTO validateOrder(Long orderId);
    PharmacyOrderDTO cancelOrder(Long orderId, String reason);
    
    // Prescriptions Management
    List<PrescriptionDTO> getPendingPrescriptions();
    PharmacyOrderDTO convertPrescriptionToOrder(Long prescriptionId, Map<String, Object> options);
    
    // ═════════════════════════════════════════════════════════════════
    // RAPPORTS PHARMACIE - Reports Generation
    // ═════════════════════════════════════════════════════════════════
    
    /** 
     * Génère un rapport complet pour la période demandée
     * @param startDate Date de début
     * @param endDate Date de fin
     * @param reportType Type de rapport (SALES, STOCK, FINANCIAL)
     * @return Rapport complet avec toutes les données
     */
    PharmacyReportDTO generateReport(LocalDateTime startDate, LocalDateTime endDate, String reportType);
    
    /**
     * Récupère l'évolution des ventes pour le graphique
     */
    List<SalesEvolutionDTO> getSalesEvolution(LocalDateTime startDate, LocalDateTime endDate, String groupBy);
    
    /**
     * Récupère les top produits vendus
     */
    List<TopProductDTO> getTopProducts(LocalDateTime startDate, LocalDateTime endDate, Integer limit);
    
    /**
     * Récupère la répartition des méthodes de paiement
     */
    List<PaymentMethodDTO> getPaymentMethodsDistribution(LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * Récupère l'analyse financière par période
     */
    List<FinancialPeriodDTO> getFinancialAnalysis(LocalDateTime startDate, LocalDateTime endDate);
}
