package com.hospital.backend.service.impl;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.PharmacyService;
import com.hospital.backend.service.ExpenseService;
import com.hospital.backend.service.RevenueService;
import com.hospital.backend.dto.ExpenseDTO;
import com.hospital.backend.entity.Expense;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PharmacyServiceImpl implements PharmacyService {

    private final PharmacyOrderRepository pharmacyOrderRepository;
    private final PharmacyOrderItemRepository pharmacyOrderItemRepository;
    private final MedicationRepository medicationRepository;
    private final SupplierRepository supplierRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final ExpenseService expenseService;
    private final RevenueService revenueService;

    // ══════════════════════════════════════════════════════════════════
    // ORDER MANAGEMENT
    // ══════════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public PharmacyOrderDTO createOrder(PharmacyOrderDTO orderDTO) {
        log.info("Creating pharmacy order for patient: {}", orderDTO.getPatientId());
        log.info("Customer name received: {}", orderDTO.getCustomerName());

        PharmacyOrder order = mapToEntity(orderDTO);
        log.info("After mapping, customerName in entity: {}", order.getCustomerName());
        
        // Validate stock availability
        for (PharmacyOrderItem item : order.getItems()) {
            if (!checkMedicationStock(item.getMedication().getId(), item.getQuantity())) {
                throw new RuntimeException("Stock insuffisant pour: " + item.getMedication().getName());
            }
        }

        PharmacyOrder savedOrder = pharmacyOrderRepository.save(order);
        log.info("Pharmacy order created: {}", savedOrder.getOrderCode());

        // ✅ DÉCRÉMENTER LE STOCK pour les ventes directes (VENTE_DIRECTE)
        // ou si le statut est déjà PAYEE (vente immédiate)
        if (savedOrder.getOrderType() == PharmacyOrderType.VENTE_DIRECTE || 
            savedOrder.getStatus() == PharmacyOrderStatus.PAYEE) {
            log.info("🔄 [STOCK] Décrémentation du stock pour la vente directe: {}", savedOrder.getOrderCode());
            for (PharmacyOrderItem item : savedOrder.getItems()) {
                Medication medication = medicationRepository.findById(item.getMedication().getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Medication not found"));
                
                Integer newStock = medication.getStockQuantity() - item.getQuantity();
                if (newStock < 0) {
                    throw new RuntimeException("Stock insuffisant pour: " + medication.getName());
                }
                
                medication.setStockQuantity(newStock);
                medicationRepository.save(medication);
                log.info("✅ [STOCK] Médicament {}: stock décrémenté de {} à {}", 
                        medication.getName(), item.getQuantity(), newStock);
                
                // Marquer l'item comme délivré pour les ventes directes
                item.setQuantityDispensed(item.getQuantity());
                pharmacyOrderItemRepository.save(item);
            }
        }

        return mapToDTO(savedOrder);
    }

    @Override
    @Transactional
    public PharmacyOrderDTO updateOrder(Long id, PharmacyOrderDTO orderDTO) {
        PharmacyOrder order = pharmacyOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        // Update order fields
        order.setNotes(orderDTO.getNotes());
        order.setDoctorNotes(orderDTO.getDoctorNotes());
        order.setArchived(orderDTO.getArchived() != null ? orderDTO.getArchived() : false); // ✅ AJOUTÉ

        PharmacyOrder updatedOrder = pharmacyOrderRepository.save(order);
        return mapToDTO(updatedOrder);
    }

    @Override
    public PharmacyOrderDTO getOrderById(Long id) {
        PharmacyOrder order = pharmacyOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        return mapToDTO(order);
    }

    @Override
    public PharmacyOrderDTO getOrderByCode(String orderCode) {
        PharmacyOrder order = pharmacyOrderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        return mapToDTO(order);
    }

    @Override
    public PageResponse<PharmacyOrderDTO> getOrdersByStatus(List<PharmacyOrderStatus> statuses, Pageable pageable) {
        Page<PharmacyOrder> orders = pharmacyOrderRepository.findByStatusIn(statuses, pageable);
        return PageResponse.<PharmacyOrderDTO>builder()
                .content(orders.getContent().stream().map(this::mapToDTO).collect(Collectors.toList()))
                .totalElements(orders.getTotalElements())
                .totalPages(orders.getTotalPages())
                .size(orders.getSize())
                .page(orders.getNumber())
                .build();
    }

    @Override
    public PageResponse<PharmacyOrderDTO> searchOrders(String query, Pageable pageable) {
        Page<PharmacyOrder> orders = pharmacyOrderRepository.searchOrders(query, pageable);
        return PageResponse.<PharmacyOrderDTO>builder()
                .content(orders.getContent().stream().map(this::mapToDTO).collect(Collectors.toList()))
                .totalElements(orders.getTotalElements())
                .totalPages(orders.getTotalPages())
                .size(orders.getSize())
                .page(orders.getNumber())
                .build();
    }

    @Override
    public List<PharmacyOrderDTO> getPendingOrders() {
        return pharmacyOrderRepository.findPendingOrders().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ══════════════════════════════════════════════════════════════════
    // ORDER STATUS MANAGEMENT
    // ══════════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public PharmacyOrderDTO updateOrderStatus(Long id, PharmacyOrderStatus status) {
        PharmacyOrder order = pharmacyOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        PharmacyOrderStatus oldStatus = order.getStatus();
        order.setStatus(status);

        // Handle stock changes based on status
        if (status == PharmacyOrderStatus.LIVREE && oldStatus != PharmacyOrderStatus.LIVREE) {
            // Decrease stock when order is delivered
            for (PharmacyOrderItem item : order.getItems()) {
                updateMedicationStock(item.getMedication().getId(), -item.getQuantity());
            }
            order.setDispensedAt(LocalDateTime.now());
        } else if (status == PharmacyOrderStatus.ANNULEE && oldStatus == PharmacyOrderStatus.LIVREE) {
            // Restore stock when delivered order is cancelled
            for (PharmacyOrderItem item : order.getItems()) {
                updateMedicationStock(item.getMedication().getId(), item.getQuantity());
            }
        }

        PharmacyOrder updatedOrder = pharmacyOrderRepository.save(order);
        
        // Send notification
        sendOrderStatusNotification(updatedOrder, oldStatus, status);
        
        return mapToDTO(updatedOrder);
    }

    @Override
    @Transactional
    public PharmacyOrderDTO processPayment(Long orderId, BigDecimal amountPaid, String paymentMethod, Boolean allowPartialPayment) {
        PharmacyOrder order = pharmacyOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        order.setAmountPaid(order.getAmountPaid().add(amountPaid));
        order.setPaymentMethod(PaymentMethod.valueOf(paymentMethod));

        // Update status based on payment
        boolean isFullyPaid = order.getAmountPaid().compareTo(order.getTotalAmount()) >= 0;
        
        if (isFullyPaid) {
            order.setStatus(PharmacyOrderStatus.PAYEE);
        } else if (allowPartialPayment != null && allowPartialPayment) {
            // Validation avec dette - permet de valider même si pas payé complètement
            order.setStatus(PharmacyOrderStatus.PAYEE);
            // Ajouter une note dans le système pour indiquer le solde restant
            BigDecimal remaining = order.getTotalAmount().subtract(order.getAmountPaid());
            String debtNote = "\n[DETTE] Paiement partiel validé. Reste à payer: " + remaining + " FC (payé: " + order.getAmountPaid() + " / total: " + order.getTotalAmount() + ")";
            order.setNotes((order.getNotes() != null ? order.getNotes() : "") + debtNote);
        }

        PharmacyOrder updatedOrder = pharmacyOrderRepository.save(order);
        
        // ★ NOTIFIER LA FINANCE DE LA VENTE
        try {
            notifyFinanceOfSale(updatedOrder, amountPaid, paymentMethod);
        } catch (Exception e) {
            log.error("❌ Erreur lors de la notification de vente à la finance: {}", e.getMessage());
        }
        
        return mapToDTO(updatedOrder);
    }

    @Override
    @Transactional
    public PharmacyOrderDTO processPayment(Long orderId, BigDecimal amountPaid, String paymentMethod) {
        // Appel avec allowPartialPayment=false par défaut pour compatibilité
        return processPayment(orderId, amountPaid, paymentMethod, false);
    }

    @Override
    @Transactional
    public PharmacyOrderDTO dispenseOrder(Long orderId, Long pharmacistId) {
        PharmacyOrder order = pharmacyOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (order.getStatus() != PharmacyOrderStatus.PAYEE) {
            throw new RuntimeException("Order must be paid before dispensing");
        }

        // Check stock availability
        for (PharmacyOrderItem item : order.getItems()) {
            if (!checkMedicationStock(item.getMedication().getId(), item.getQuantity())) {
                throw new RuntimeException("Stock insuffisant pour: " + item.getMedication().getName());
            }
        }

        User pharmacist = userRepository.findById(pharmacistId)
                .orElseThrow(() -> new ResourceNotFoundException("Pharmacist not found"));

        order.setDispensedBy(pharmacist);
        order.setDispensedAt(LocalDateTime.now());
        order.setStatus(PharmacyOrderStatus.LIVREE);

        // Update stock
        for (PharmacyOrderItem item : order.getItems()) {
            updateMedicationStock(item.getMedication().getId(), -item.getQuantity());
            item.setQuantityDispensed(item.getQuantity());
        }

        PharmacyOrder updatedOrder = pharmacyOrderRepository.save(order);
        return mapToDTO(updatedOrder);
    }

    // ══════════════════════════════════════════════════════════════════
    // STOCK MANAGEMENT
    // ══════════════════════════════════════════════════════════════════

    @Override
    public boolean checkMedicationStock(Long medicationId, Integer requiredQuantity) {
        Medication medication = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Medication not found"));

        return medication.getStockQuantity() >= requiredQuantity;
    }

    @Override
    @Transactional
    public void updateMedicationStock(Long medicationId, Integer quantityChange) {
        Medication medication = medicationRepository.findById(medicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Medication not found"));

        Integer newStock = medication.getStockQuantity() + quantityChange;
        if (newStock < 0) {
            throw new RuntimeException("Stock cannot be negative");
        }

        medication.setStockQuantity(newStock);
        medicationRepository.save(medication);

        // Check for low stock alert
        if (newStock <= medication.getMinimumStock()) {
            sendLowStockAlert(medication);
        }
    }

    @Override
    public List<PharmacyOrderDTO> getUnpaidOrders() {
        return pharmacyOrderRepository.findUnpaidOrders().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ══════════════════════════════════════════════════════════════════
    // SUPPLIER MANAGEMENT
    // ══════════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public SupplierDTO createSupplier(SupplierDTO supplierDTO) {
        Supplier supplier = mapToEntity(supplierDTO);
        Supplier savedSupplier = supplierRepository.save(supplier);
        return mapToDTO(savedSupplier);
    }

    @Override
    @Transactional
    public SupplierDTO updateSupplier(Long id, SupplierDTO supplierDTO) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));

        supplier.setName(supplierDTO.getName());
        supplier.setDescription(supplierDTO.getDescription());
        supplier.setContactPerson(supplierDTO.getContactPerson());
        supplier.setPhoneNumber(supplierDTO.getPhoneNumber());
        supplier.setEmailAddress(supplierDTO.getEmailAddress());
        supplier.setPhysicalAddress(supplierDTO.getPhysicalAddress());
        supplier.setPaymentTerms(supplierDTO.getPaymentTerms());
        supplier.setDeliveryTime(supplierDTO.getDeliveryTime());
        supplier.setIsActive(supplierDTO.getIsActive());
        supplier.setIsPreferred(supplierDTO.getIsPreferred());

        Supplier updatedSupplier = supplierRepository.save(supplier);
        return mapToDTO(updatedSupplier);
    }

    @Override
    public SupplierDTO getSupplierById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));
        return mapToDTO(supplier);
    }

    @Override
    public List<SupplierDTO> getActiveSuppliers() {
        return supplierRepository.findByIsActiveTrue().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public PageResponse<SupplierDTO> searchSuppliers(String query, Pageable pageable) {
        Page<Supplier> suppliers = supplierRepository.searchSuppliers(query, pageable);
        return PageResponse.<SupplierDTO>builder()
                .content(suppliers.getContent().stream().map(this::mapToDTO).collect(Collectors.toList()))
                .totalElements(suppliers.getTotalElements())
                .totalPages(suppliers.getTotalPages())
                .size(suppliers.getSize())
                .page(suppliers.getNumber())
                .build();
    }

    // ══════════════════════════════════════════════════════════════════
    // DASHBOARD STATISTICS
    // ══════════════════════════════════════════════════════════════════

    @Override
    public PharmacyDashboardStatsDTO getDashboardStats() {
        LocalDateTime today = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime monthStart = today.withDayOfMonth(1);

        // Dashboard method - includes ALL sales (archived and non-archived) for accurate stats
        // Include both PAYEE and LIVREE statuses for sales
        List<PharmacyOrder> todayOrders = pharmacyOrderRepository.findAllOrdersForDashboard(
                List.of(PharmacyOrderStatus.PAYEE, PharmacyOrderStatus.LIVREE), today);
        
        List<PharmacyOrder> monthOrders = pharmacyOrderRepository.findAllOrdersForDashboard(
                List.of(PharmacyOrderStatus.PAYEE, PharmacyOrderStatus.LIVREE), monthStart);

        List<Medication> lowStockMeds = medicationRepository.findLowStockMedications();
        List<PharmacyOrder> unpaidOrders = pharmacyOrderRepository.findUnpaidOrders();
        List<PharmacyOrder> pendingOrders = pharmacyOrderRepository.findPendingOrders();

        BigDecimal todaySales = todayOrders.stream()
                .map(PharmacyOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal monthSales = monthOrders.stream()
                .map(PharmacyOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return PharmacyDashboardStatsDTO.builder()
                .pendingPrescriptions((long) pendingOrders.size())
                .todayRevenue((long) todayOrders.size())
                .lowStockAlerts((long) lowStockMeds.size())
                .totalOrdersToday((long) todayOrders.size())
                .totalOrdersThisMonth((long) monthOrders.size())
                .todaySalesAmount(todaySales)
                .monthlySalesAmount(monthSales)
                .unpaidOrders((long) unpaidOrders.size())
                .readyForDispensation(pendingOrders.stream()
                        .filter(o -> o.getStatus() == PharmacyOrderStatus.PAYEE)
                        .count())
                .expiredMedications((long) medicationRepository.findExpiredMedications().size())
                .stockAlerts(lowStockMeds.stream()
                        .map(this::mapToDashboardStockAlertDTO)
                        .collect(Collectors.toList()))
                .build();
    }

    // ══════════════════════════════════════════════════════════════════
    // ORDER ITEMS
    // ══════════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public PharmacyOrderItemDTO addOrderItem(Long orderId, PharmacyOrderItemDTO itemDTO) {
        PharmacyOrder order = pharmacyOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (order.getStatus() != PharmacyOrderStatus.EN_ATTENTE) {
            throw new RuntimeException("Cannot add items to order in status: " + order.getStatus());
        }

        PharmacyOrderItem item = mapToEntity(itemDTO);
        item.setPharmacyOrder(order);

        PharmacyOrderItem savedItem = pharmacyOrderItemRepository.save(item);

        // Update order total
        updateOrderTotal(order);

        return mapToDTO(savedItem);
    }

    @Override
    @Transactional
    public PharmacyOrderItemDTO updateOrderItem(Long itemId, PharmacyOrderItemDTO itemDTO) {
        PharmacyOrderItem item = pharmacyOrderItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Order item not found"));

        item.setQuantity(itemDTO.getQuantity());
        item.setUnitPrice(itemDTO.getUnitPrice());
        item.setDosageInstructions(itemDTO.getDosageInstructions());

        PharmacyOrderItem updatedItem = pharmacyOrderItemRepository.save(item);

        // Update order total
        updateOrderTotal(item.getPharmacyOrder());

        return mapToDTO(updatedItem);
    }

    @Override
    @Transactional
    public void removeOrderItem(Long itemId) {
        PharmacyOrderItem item = pharmacyOrderItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Order item not found"));

        PharmacyOrder order = item.getPharmacyOrder();
        pharmacyOrderItemRepository.delete(item);

        // Update order total
        updateOrderTotal(order);
    }

    // ══════════════════════════════════════════════════════════════════
    // STOCK ALERTS
    // ══════════════════════════════════════════════════════════════════

    @Override
    public List<MedicationStockAlertDTO> getStockAlerts() {
        List<Medication> lowStockMeds = medicationRepository.findLowStockMedications();
        return lowStockMeds.stream()
                .map(this::mapToStockAlertDTO)
                .collect(Collectors.toList());
    }

    // ══════════════════════════════════════════════════════════════════
    // ORDER VALIDATION
    // ══════════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public PharmacyOrderDTO validateOrder(Long orderId) {
        PharmacyOrder order = pharmacyOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (order.getStatus() != PharmacyOrderStatus.EN_ATTENTE) {
            throw new RuntimeException("Order cannot be validated in status: " + order.getStatus());
        }

        order.setStatus(PharmacyOrderStatus.EN_PREPARATION);
        order.setValidatedAt(LocalDateTime.now());

        PharmacyOrder updatedOrder = pharmacyOrderRepository.save(order);
        return mapToDTO(updatedOrder);
    }

    @Override
    @Transactional
    public PharmacyOrderDTO cancelOrder(Long orderId, String reason) {
        PharmacyOrder order = pharmacyOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        PharmacyOrderStatus oldStatus = order.getStatus();
        order.setStatus(PharmacyOrderStatus.ANNULEE);
        order.setNotes(order.getNotes() + "\nRaison d'annulation: " + reason);

        // Restore stock if order was already delivered
        if (oldStatus == PharmacyOrderStatus.LIVREE) {
            for (PharmacyOrderItem item : order.getItems()) {
                updateMedicationStock(item.getMedication().getId(), item.getQuantity());
            }
        }

        PharmacyOrder updatedOrder = pharmacyOrderRepository.save(order);
        return mapToDTO(updatedOrder);
    }

    // ══════════════════════════════════════════════════════════════════
    // PRIVATE HELPER METHODS
    // ══════════════════════════════════════════════════════════════════

    private void updateOrderTotal(PharmacyOrder order) {
        BigDecimal total = order.getItems().stream()
                .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        order.setTotalAmount(total);
        pharmacyOrderRepository.save(order);
    }

    private void sendOrderStatusNotification(PharmacyOrder order, PharmacyOrderStatus oldStatus, PharmacyOrderStatus newStatus) {
        // Implementation for sending notifications
        log.info("Order {} status changed from {} to {}", order.getOrderCode(), oldStatus, newStatus);
    }

    private void sendLowStockAlert(Medication medication) {
        // Implementation for low stock alerts
        log.warn("Low stock alert for medication: {}", medication.getName());
    }

    // MAPPING METHODS (simplified for brevity)
    private PharmacyOrder mapToEntity(PharmacyOrderDTO dto) {
        PharmacyOrder order = new PharmacyOrder();
        order.setId(dto.getId());
        order.setOrderCode(dto.getOrderCode());
        
        if (dto.getStatus() != null) {
            order.setStatus(PharmacyOrderStatus.valueOf(dto.getStatus()));
        }
        if (dto.getOrderType() != null) {
            order.setOrderType(PharmacyOrderType.valueOf(dto.getOrderType()));
        } else {
            // Default to VENTE_DIRECTE if not specified
            order.setOrderType(PharmacyOrderType.VENTE_DIRECTE);
        }
        
        order.setTotalAmount(dto.getTotalAmount());
        order.setAmountPaid(dto.getAmountPaid());
        
        if (dto.getPaymentMethod() != null) {
            order.setPaymentMethod(PaymentMethod.valueOf(dto.getPaymentMethod()));
        }
        order.setPaymentReference(dto.getPaymentReference());
        order.setNotes(dto.getNotes());
        order.setDoctorNotes(dto.getDoctorNotes());
        order.setIsExternalPrescription(dto.getIsExternalPrescription());
        order.setExternalPrescriptionNumber(dto.getExternalPrescriptionNumber());
        order.setValidatedAt(dto.getValidatedAt());
        order.setDispensedAt(dto.getDispensedAt());
        order.setCustomerName(dto.getCustomerName() != null ? dto.getCustomerName().trim() : null);
        order.setArchived(dto.getArchived() != null ? dto.getArchived() : false);
        order.setUpdatedAt(dto.getUpdatedAt() != null ? dto.getUpdatedAt() : LocalDateTime.now());
        
        // Map items
        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            List<PharmacyOrderItem> items = dto.getItems().stream()
                .map(this::mapItemToEntity)
                .collect(Collectors.toList());
            order.setItems(items);
            // Set bidirectional relationship
            items.forEach(item -> item.setPharmacyOrder(order));
        } else {
            order.setItems(new ArrayList<>());
        }
        
        // Load patient if patientId is provided
        if (dto.getPatientId() != null) {
            Patient patient = patientRepository.findById(dto.getPatientId())
                .orElse(null);
            order.setPatient(patient);
        }
        
        return order;
    }
    
    private PharmacyOrderItem mapItemToEntity(PharmacyOrderItemDTO dto) {
        PharmacyOrderItem item = new PharmacyOrderItem();
        item.setId(dto.getId());
        item.setQuantity(dto.getQuantity());
        item.setUnitPrice(dto.getUnitPrice());
        item.setTotalPrice(dto.getTotalPrice());
        item.setQuantityDispensed(dto.getQuantityDispensed());
        item.setBatchNumber(dto.getBatchNumber());
        item.setExpiryDate(dto.getExpiryDate());
        item.setDosageInstructions(dto.getDosageInstructions());
        item.setIsExternal(dto.getIsExternal());
        
        // Load medication
        if (dto.getMedicationId() != null) {
            Medication medication = medicationRepository.findById(dto.getMedicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Medication not found: " + dto.getMedicationId()));
            item.setMedication(medication);
        }
        
        return item;
    }
    
    private PharmacyOrderDTO mapToDTO(PharmacyOrder entity) {
        if (entity == null) return null;
        
        PharmacyOrderDTO dto = new PharmacyOrderDTO();
        dto.setId(entity.getId());
        dto.setOrderCode(entity.getOrderCode());
        dto.setStatus(entity.getStatus() != null ? entity.getStatus().name() : null);
        dto.setOrderType(entity.getOrderType() != null ? entity.getOrderType().name() : null);
        // Priorité: patient.name > customerName > "Client comptoir"
        String displayName;
        if (entity.getPatient() != null) {
            displayName = entity.getPatient().getFirstName() + " " + entity.getPatient().getLastName();
        } else if (entity.getCustomerName() != null && !entity.getCustomerName().trim().isEmpty()) {
            displayName = entity.getCustomerName().trim();
        } else {
            displayName = "Client comptoir";
        }
        
        dto.setPatientName(displayName);
        dto.setCustomerName(entity.getCustomerName());
        log.info("📋 [MAP DTO] Order {} - Patient: {}, CustomerName: {}, FinalDisplay: '{}'", 
            entity.getId(),
            entity.getPatient() != null ? entity.getPatient().getId() : "null",
            entity.getCustomerName(),
            displayName);
        dto.setPatientId(entity.getPatient() != null ? entity.getPatient().getId() : null);
        dto.setTotalAmount(entity.getTotalAmount());
        dto.setAmountPaid(entity.getAmountPaid());
        dto.setPaymentMethod(entity.getPaymentMethod() != null ? entity.getPaymentMethod().name() : null);
        dto.setPaymentReference(entity.getPaymentReference());
        dto.setNotes(entity.getNotes());
        dto.setDoctorNotes(entity.getDoctorNotes());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setArchived(entity.getArchived() != null ? entity.getArchived() : false);
        dto.setCustomerName(entity.getCustomerName());
        dto.setDispensedAt(entity.getDispensedAt());
        dto.setSupplierId(entity.getSupplier() != null ? entity.getSupplier().getId() : null);
        
        // Map items
        if (entity.getItems() != null) {
            dto.setItems(entity.getItems().stream()
                .map(this::mapItemToDTO)
                .collect(Collectors.toList()));
        }
        
        // Calculated fields for debt tracking
        BigDecimal totalAmount = entity.getTotalAmount() != null ? entity.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal amountPaid = entity.getAmountPaid() != null ? entity.getAmountPaid() : BigDecimal.ZERO;
        BigDecimal remainingAmount = totalAmount.subtract(amountPaid);
        
        dto.setRemainingAmount(remainingAmount.compareTo(BigDecimal.ZERO) > 0 ? remainingAmount : BigDecimal.ZERO);
        dto.setIsFullyPaid(remainingAmount.compareTo(BigDecimal.ZERO) <= 0);
        dto.setIsFullyDispensed(entity.getItems() != null && entity.getItems().stream()
                .allMatch(item -> item.getQuantityDispensed() != null && 
                         item.getQuantityDispensed() >= item.getQuantity()));
        
        return dto;
    }
    
    private PharmacyOrderItemDTO mapItemToDTO(PharmacyOrderItem item) {
        if (item == null) return null;
        
        PharmacyOrderItemDTO dto = new PharmacyOrderItemDTO();
        dto.setId(item.getId());
        dto.setMedicationId(item.getMedication() != null ? item.getMedication().getId() : null);
        dto.setMedicationName(item.getMedication() != null ? item.getMedication().getName() : null);
        dto.setQuantity(item.getQuantity());
        dto.setQuantityDispensed(item.getQuantityDispensed());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setTotalPrice(item.getTotalPrice());
        dto.setDosageInstructions(item.getDosageInstructions());
        
        return dto;
    }
    private PharmacyOrderItem mapToEntity(PharmacyOrderItemDTO dto) { /* implementation */ return new PharmacyOrderItem(); }
    private PharmacyOrderItemDTO mapToDTO(PharmacyOrderItem entity) { /* implementation */ return new PharmacyOrderItemDTO(); }
    private Supplier mapToEntity(SupplierDTO dto) { /* implementation */ return new Supplier(); }
    private SupplierDTO mapToDTO(Supplier entity) { /* implementation */ return new SupplierDTO(); }
    private MedicationStockAlertDTO mapToStockAlertDTO(Medication medication) {
        if (medication == null) return null;
        
        String alertLevel = "LOW";
        if (medication.getStockQuantity() == 0) {
            alertLevel = "OUT_OF_STOCK";
        } else if (medication.getStockQuantity() <= medication.getMinimumStock() / 2) {
            alertLevel = "CRITICAL";
        }
        
        int deficit = medication.getMinimumStock() - medication.getStockQuantity();
        double percentageRemaining = medication.getMinimumStock() > 0 
            ? (medication.getStockQuantity() * 100.0 / medication.getMinimumStock()) 
            : 0;
        
        String recommendedAction;
        if ("OUT_OF_STOCK".equals(alertLevel)) {
            recommendedAction = "Réapprovisionnement urgent nécessaire";
        } else if ("CRITICAL".equals(alertLevel)) {
            recommendedAction = "Commander dès que possible";
        } else {
            recommendedAction = "Prévoir réapprovisionnement";
        }
        
        return MedicationStockAlertDTO.builder()
                .medicationId(medication.getId())
                .medicationCode(medication.getMedicationCode())
                .medicationName(medication.getName())
                .genericName(medication.getGenericName())
                .currentStock(medication.getStockQuantity())
                .minimumStock(medication.getMinimumStock())
                .optimalStock(medication.getMinimumStock() * 2)
                .alertLevel(alertLevel)
                .lastUpdated(medication.getUpdatedAt())
                .isActive(medication.getIsActive())
                .deficit(deficit > 0 ? deficit : 0)
                .percentageRemaining(Math.round(percentageRemaining * 100.0) / 100.0)
                .recommendedAction(recommendedAction)
                .build();
    }
    private PharmacyDashboardStatsDTO.StockAlertDTO mapToDashboardStockAlertDTO(Medication medication) {
        if (medication == null) return null;
        
        String alertLevel = "LOW";
        if (medication.getStockQuantity() == 0) {
            alertLevel = "OUT_OF_STOCK";
        } else if (medication.getStockQuantity() <= medication.getMinimumStock() / 2) {
            alertLevel = "CRITICAL";
        }
        
        return PharmacyDashboardStatsDTO.StockAlertDTO.builder()
                .medicationId(medication.getId())
                .medicationName(medication.getName())
                .medicationCode(medication.getMedicationCode())
                .currentStock(medication.getStockQuantity())
                .minimumStock(medication.getMinimumStock())
                .alertLevel(alertLevel)
                .build();
    }

    // ══════════════════════════════════════════════════════════════════
    // SALES HISTORY
    // ══════════════════════════════════════════════════════════════════

    @Override
    public PageResponse<PharmacyOrderDTO> getSalesHistory(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable, Boolean archived) {
        log.info("📊 [SALES HISTORY] Récupération de l'historique des ventes du {} au {} (archived: {})", startDate, endDate, archived);
        
        Page<PharmacyOrder> salesPage;
        
        // Si archived est null ou false, on utilise findActiveSalesHistory (ventes non-archivées)
        // Si archived est true, on utilise findByArchivedTrue (ventes archivées seulement)
        if (archived == null || !archived) {
            salesPage = pharmacyOrderRepository.findActiveSalesHistory(startDate, endDate, pageable);
            log.info("📊 [SALES HISTORY] {} ventes actives trouvées", salesPage.getTotalElements());
        } else {
            salesPage = pharmacyOrderRepository.findByArchivedTrue(pageable);
            log.info("📊 [SALES HISTORY] {} ventes archivées trouvées", salesPage.getTotalElements());
        }
        
        return PageResponse.<PharmacyOrderDTO>builder()
                .content(salesPage.getContent().stream().map(this::mapToDTO).collect(Collectors.toList()))
                .totalElements(salesPage.getTotalElements())
                .totalPages(salesPage.getTotalPages())
                .size(salesPage.getSize())
                .page(salesPage.getNumber())
                .build();
    }

    // ══════════════════════════════════════════════════════════════════
    // PRESCRIPTIONS MANAGEMENT IMPLEMENTATION
    // ══════════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<PrescriptionDTO> getPendingPrescriptions() {
        log.info("🔄 [PRESCRIPTION] Récupération des prescriptions pour la pharmacie");
        
        // Récupérer les prescriptions avec statuts pertinents pour la pharmacie
        List<Prescription> prescriptions = prescriptionRepository.findPendingPrescriptions();
        
        return prescriptions.stream()
            .map(this::mapToPrescriptionDTO)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PharmacyOrderDTO convertPrescriptionToOrder(Long prescriptionId, Map<String, Object> options) {
        log.info("🔄 [PRESCRIPTION] Conversion de la prescription {} en commande pharmacie", prescriptionId);
        
        // Récupérer la prescription
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
            .orElseThrow(() -> new ResourceNotFoundException("Prescription non trouvée"));
        
        // Créer la commande pharmacie
        PharmacyOrder order = PharmacyOrder.builder()
            .orderCode(generateOrderCode())
            .patient(prescription.getPatient())
            .status(PharmacyOrderStatus.EN_PREPARATION)
            .orderType(PharmacyOrderType.ORDONNANCE_EXTERNE)
            .totalAmount(BigDecimal.ZERO)
            .amountPaid(BigDecimal.ZERO)
            .createdAt(LocalDateTime.now())
            .build();
        
        order = pharmacyOrderRepository.save(order);
        
        // Ajouter les items de la prescription à la commande
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (PrescriptionItem prescriptionItem : prescription.getItems()) {
            PharmacyOrderItem orderItem = PharmacyOrderItem.builder()
                .pharmacyOrder(order)
                .medication(prescriptionItem.getMedication())
                .quantity(prescriptionItem.getQuantity())
                .unitPrice(prescriptionItem.getMedication().getUnitPrice() != null ? 
                    prescriptionItem.getMedication().getUnitPrice() : BigDecimal.ZERO)
                .dosageInstructions(prescriptionItem.getDosage())
                .build();
            
            BigDecimal itemTotal = orderItem.getUnitPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);
            
            pharmacyOrderItemRepository.save(orderItem);
        }
        
        // Mettre à jour le montant total
        order.setTotalAmount(totalAmount);
        order = pharmacyOrderRepository.save(order);
        
        // Mettre à jour le statut de la prescription
        prescription.setStatus(PrescriptionStatus.PRESCRIPTION_ENVOYEE);
        prescriptionRepository.save(prescription);
        
        log.info("✅ [PRESCRIPTION] Prescription {} convertie en commande {}", prescriptionId, order.getOrderCode());
        
        return mapToDTO(order);
    }
    
    private String generateOrderCode() {
        return "ORD-" + System.currentTimeMillis();
    }

    // ═════════════════════════════════════════════════════════════════
    // RAPPORTS PHARMACIE - Reports Generation Implementation
    // ═════════════════════════════════════════════════════════════════

    @Override
    public PharmacyReportDTO generateReport(LocalDateTime startDate, LocalDateTime endDate, String reportType) {
        log.info("📊 [REPORT] Génération du rapport {} du {} au {}", reportType, startDate, endDate);
        
        PharmacyReportDTO.PharmacyReportDTOBuilder report = PharmacyReportDTO.builder();
        
        // Common stats for all reports
        List<PharmacyOrder> orders = pharmacyOrderRepository.findByCreatedAtBetweenAndStatusIn(
            startDate, endDate, 
            List.of(PharmacyOrderStatus.PAYEE, PharmacyOrderStatus.LIVREE)
        );
        
        // Sales Stats
        BigDecimal totalSales = orders.stream()
            .map(PharmacyOrder::getTotalAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        PharmacyReportDTO.SalesStatsDTO salesStats = PharmacyReportDTO.SalesStatsDTO.builder()
            .totalSales(totalSales)
            .totalOrders((long) orders.size())
            .averageOrderValue(orders.isEmpty() ? BigDecimal.ZERO : 
                totalSales.divide(BigDecimal.valueOf(orders.size()), 2, RoundingMode.HALF_UP))
            .totalItems(orders.stream().mapToLong(o -> o.getItems().size()).sum())
            .build();
        report.salesStats(salesStats);
        
        // Report type specific data
        switch (reportType.toUpperCase()) {
            case "SALES":
                report.dailySales(getSalesEvolution(startDate, endDate, "day"));
                report.topProducts(getTopProducts(startDate, endDate, 5));
                report.paymentMethods(getPaymentMethodsDistribution(startDate, endDate));
                break;
            case "STOCK":
                report.stockMetrics(getStockMetrics());
                report.stockRotation(getStockRotationData());
                report.stockAlerts(getStockAlerts());
                break;
            case "FINANCIAL":
                report.financialPeriods(getFinancialAnalysis(startDate, endDate));
                report.financialSummary(getFinancialSummary(orders));
                break;
        }
        
        return report.build();
    }
    
    @Override
    public List<SalesEvolutionDTO> getSalesEvolution(LocalDateTime startDate, LocalDateTime endDate, String groupBy) {
        log.info("📈 [SALES EVOLUTION] Période: {} à {}, groupBy: {}", startDate, endDate, groupBy);
        
        List<PharmacyOrder> orders = pharmacyOrderRepository.findByCreatedAtBetweenAndStatusIn(
            startDate, endDate,
            List.of(PharmacyOrderStatus.PAYEE, PharmacyOrderStatus.LIVREE)
        );
        
        // Group by day of week for simplicity
        Map<String, List<PharmacyOrder>> grouped = orders.stream()
            .collect(Collectors.groupingBy(o -> o.getCreatedAt().getDayOfWeek().toString().substring(0, 3)));
        
        String[] days = {"MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"};
        String[] frenchDays = {"Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"};
        
        List<SalesEvolutionDTO> result = new ArrayList<>();
        for (int i = 0; i < days.length; i++) {
            List<PharmacyOrder> dayOrders = grouped.getOrDefault(days[i], List.of());
            BigDecimal sales = dayOrders.stream()
                .map(PharmacyOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            result.add(SalesEvolutionDTO.builder()
                .day(frenchDays[i])
                .sales(sales)
                .orders(dayOrders.size())
                .build());
        }
        
        return result;
    }
    
    @Override
    public List<TopProductDTO> getTopProducts(LocalDateTime startDate, LocalDateTime endDate, Integer limit) {
        log.info("🏆 [TOP PRODUCTS] Période: {} à {}, limit: {}", startDate, endDate, limit);
        
        List<PharmacyOrder> orders = pharmacyOrderRepository.findByCreatedAtBetweenAndStatusIn(
            startDate, endDate,
            List.of(PharmacyOrderStatus.PAYEE, PharmacyOrderStatus.LIVREE)
        );
        
        // Aggregate sales by medication
        Map<Medication, List<PharmacyOrderItem>> grouped = orders.stream()
            .flatMap(o -> o.getItems().stream())
            .filter(item -> item.getMedication() != null)
            .collect(Collectors.groupingBy(PharmacyOrderItem::getMedication));
        
        List<TopProductDTO> products = grouped.entrySet().stream()
            .map(entry -> {
                Medication med = entry.getKey();
                List<PharmacyOrderItem> items = entry.getValue();
                int quantity = items.stream().mapToInt(PharmacyOrderItem::getQuantity).sum();
                BigDecimal revenue = items.stream()
                    .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                
                return TopProductDTO.builder()
                    .name(med.getName())
                    .quantity(quantity)
                    .revenue(revenue)
                    .medicationId(med.getId())
                    .build();
            })
            .sorted((a, b) -> b.getQuantity().compareTo(a.getQuantity()))
            .limit(limit)
            .collect(Collectors.toList());
        
        return products;
    }
    
    @Override
    public List<PaymentMethodDTO> getPaymentMethodsDistribution(LocalDateTime startDate, LocalDateTime endDate) {
        log.info("💳 [PAYMENT METHODS] Période: {} à {}", startDate, endDate);
        
        List<PharmacyOrder> orders = pharmacyOrderRepository.findByCreatedAtBetweenAndStatusIn(
            startDate, endDate,
            List.of(PharmacyOrderStatus.PAYEE, PharmacyOrderStatus.LIVREE)
        );
        
        // Group by payment method
        Map<PaymentMethod, List<PharmacyOrder>> grouped = orders.stream()
            .filter(o -> o.getPaymentMethod() != null)
            .collect(Collectors.groupingBy(PharmacyOrder::getPaymentMethod));
        
        BigDecimal total = orders.stream()
            .map(PharmacyOrder::getTotalAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        String[] colors = {"#10B981", "#3B82F6", "#F59E0B", "#8B5CF6"};
        int colorIndex = 0;
        
        List<PaymentMethodDTO> methods = new ArrayList<>();
        for (Map.Entry<PaymentMethod, List<PharmacyOrder>> entry : grouped.entrySet()) {
            BigDecimal amount = entry.getValue().stream()
                .map(PharmacyOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            int percentage = total.compareTo(BigDecimal.ZERO) > 0 
                ? amount.multiply(BigDecimal.valueOf(100)).divide(total, 0, RoundingMode.HALF_UP).intValue()
                : 0;
            
            String methodName = switch (entry.getKey()) {
                case ESPECES, CASH -> "Espèces";
                case CARTE_BANCAIRE -> "Carte Bancaire";
                case MOBILE_MONEY -> "Mobile Money";
                case ASSURANCE -> "Assurance";
                case VIREMENT -> "Virement";
                case CHEQUE -> "Chèque";
                default -> entry.getKey().name();
            };
            
            methods.add(PaymentMethodDTO.builder()
                .name(methodName)
                .amount(amount)
                .value(percentage)
                .color(colors[colorIndex % colors.length])
                .count((long) entry.getValue().size())
                .build());
            
            colorIndex++;
        }
        
        return methods;
    }
    
    @Override
    public List<FinancialPeriodDTO> getFinancialAnalysis(LocalDateTime startDate, LocalDateTime endDate) {
        log.info("💰 [FINANCIAL ANALYSIS] Période: {} à {}", startDate, endDate);
        
        List<PharmacyOrder> orders = pharmacyOrderRepository.findByCreatedAtBetweenAndStatusIn(
            startDate, endDate,
            List.of(PharmacyOrderStatus.PAYEE, PharmacyOrderStatus.LIVREE)
        );
        
        // Group by month
        Map<String, List<PharmacyOrder>> grouped = orders.stream()
            .collect(Collectors.groupingBy(o -> {
                int month = o.getCreatedAt().getMonthValue();
                String[] months = {"Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"};
                return months[month - 1];
            }));
        
        String[] months = {"Jan", "Fév", "Mar", "Avr", "Mai", "Juin"};
        List<FinancialPeriodDTO> result = new ArrayList<>();
        
        for (String month : months) {
            List<PharmacyOrder> monthOrders = grouped.getOrDefault(month, List.of());
            BigDecimal revenue = monthOrders.stream()
                .map(PharmacyOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            // Simulate expenses as 60% of revenue (typical pharmacy margin)
            BigDecimal expenses = revenue.multiply(BigDecimal.valueOf(0.6));
            BigDecimal profit = revenue.subtract(expenses);
            
            result.add(FinancialPeriodDTO.builder()
                .month(month)
                .revenue(revenue)
                .expenses(expenses)
                .profit(profit)
                .build());
        }
        
        return result;
    }
    
    // ═════════════════════════════════════════════════════════════════
    // PRIVATE HELPER METHODS FOR REPORTS
    // ═════════════════════════════════════════════════════════════════
    
    private PharmacyReportDTO.StockMetricsDTO getStockMetrics() {
        List<Medication> medications = medicationRepository.findAll();
        List<Medication> lowStock = medicationRepository.findLowStockMedications();
        
        BigDecimal valuation = medications.stream()
            .map(m -> {
                BigDecimal price = m.getUnitPrice() != null ? m.getUnitPrice() : BigDecimal.ZERO;
                return price.multiply(BigDecimal.valueOf(m.getStockQuantity()));
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        return PharmacyReportDTO.StockMetricsDTO.builder()
            .stockValuation(valuation)
            .totalItems((long) medications.stream().mapToLong(Medication::getStockQuantity).sum())
            .alertsCount((long) lowStock.size())
            .averageRotation("12j")
            .build();
    }
    
    private List<PharmacyReportDTO.StockRotationDTO> getStockRotationData() {
        // Get all medications with stock
        List<Medication> medications = medicationRepository.findAll();
        
        // Calculate rotation for each medication based on sales velocity
        // Rotation = days to deplete current stock at current sales rate
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        LocalDateTime now = LocalDateTime.now();
        
        List<PharmacyOrder> recentOrders = pharmacyOrderRepository.findByCreatedAtBetweenAndStatusIn(
            thirtyDaysAgo, now,
            List.of(PharmacyOrderStatus.PAYEE, PharmacyOrderStatus.LIVREE)
        );
        
        return medications.stream()
            .filter(m -> m.getStockQuantity() > 0)
            .map(med -> {
                // Calculate sales velocity (units sold per day)
                int unitsSold = recentOrders.stream()
                    .flatMap(o -> o.getItems().stream())
                    .filter(item -> item.getMedication() != null && 
                           item.getMedication().getId().equals(med.getId()))
                    .mapToInt(PharmacyOrderItem::getQuantity)
                    .sum();
                
                double dailySalesRate = unitsSold / 30.0; // per day
                
                // Calculate rotation days
                int rotationDays;
                if (dailySalesRate > 0) {
                    rotationDays = (int) Math.ceil(med.getStockQuantity() / dailySalesRate);
                } else {
                    // No sales in last 30 days - assume slow mover
                    rotationDays = 90; // Default for non-moving stock
                }
                
                // Cap at 365 days for display
                String rotationStr = rotationDays > 365 ? "365j+" : rotationDays + "j";
                
                return PharmacyReportDTO.StockRotationDTO.builder()
                    .product(med.getName())
                    .rotation(rotationStr)
                    .stock((long) med.getStockQuantity())
                    .min((long) med.getMinimumStock())
                    .build();
            })
            .sorted((a, b) -> {
                // Parse rotation days for sorting (higher = worse)
                int rotA = parseRotationDays(a.getRotation());
                int rotB = parseRotationDays(b.getRotation());
                return Integer.compare(rotB, rotA); // Descending: worst rotation first
            })
            .limit(10) // Top 10 products needing attention
            .collect(Collectors.toList());
    }
    
    private int parseRotationDays(String rotation) {
        if (rotation == null || rotation.isEmpty()) return 0;
        try {
            return Integer.parseInt(rotation.replace("j", "").replace("+", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
    
    private PharmacyReportDTO.FinancialSummaryDTO getFinancialSummary(List<PharmacyOrder> orders) {
        BigDecimal revenue = orders.stream()
            .map(PharmacyOrder::getTotalAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal expenses = revenue.multiply(BigDecimal.valueOf(0.6));
        BigDecimal profit = revenue.subtract(expenses);
        
        return PharmacyReportDTO.FinancialSummaryDTO.builder()
            .totalRevenue(revenue)
            .totalExpenses(expenses)
            .totalProfit(profit)
            .profitMargin(revenue.compareTo(BigDecimal.ZERO) > 0 
                ? profit.divide(revenue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0.0)
            .averageCart(orders.isEmpty() ? BigDecimal.ZERO : 
                revenue.divide(BigDecimal.valueOf(orders.size()), 2, RoundingMode.HALF_UP))
            .build();
    }

    // ═════════════════════════════════════════════════════════════════
    // PRESCRIPTION MAPPING METHODS
    // ═════════════════════════════════════════════════════════════════

    private PrescriptionDTO mapToPrescriptionDTO(Prescription prescription) {
        if (prescription == null) return null;

        List<PrescriptionDTO.PrescriptionItemDTO> items = prescription.getItems() != null
            ? prescription.getItems().stream()
                .map(this::mapPrescriptionItemToDTO)
                .collect(Collectors.toList())
            : List.of();

        return PrescriptionDTO.builder()
            .id(prescription.getId())
            .prescriptionCode(prescription.getPrescriptionCode())
            .patientId(prescription.getPatient() != null ? prescription.getPatient().getId() : null)
            .patientName(prescription.getPatient() != null
                ? prescription.getPatient().getFirstName() + " " + prescription.getPatient().getLastName()
                : null)
            .doctorId(prescription.getDoctor() != null ? prescription.getDoctor().getId() : null)
            .doctorName(prescription.getDoctor() != null
                ? prescription.getDoctor().getFirstName() + " " + prescription.getDoctor().getLastName()
                : null)
            .consultationId(prescription.getConsultation() != null ? prescription.getConsultation().getId() : null)
            .status(prescription.getStatus())
            .notes(prescription.getNotes())
            .createdAt(prescription.getCreatedAt())
            .items(items)
            .build();
    }

    private PrescriptionDTO.PrescriptionItemDTO mapPrescriptionItemToDTO(PrescriptionItem item) {
        if (item == null) return null;

        Medication medication = item.getMedication();
        BigDecimal unitPrice = medication != null && medication.getUnitPrice() != null
            ? medication.getUnitPrice()
            : BigDecimal.ZERO;
        Integer quantity = item.getQuantity() != null ? item.getQuantity() : 0;

        return PrescriptionDTO.PrescriptionItemDTO.builder()
            .id(item.getId())
            .medicationId(medication != null ? medication.getId() : null)
            .medicationName(medication != null ? medication.getName() : "Unknown")
            .dosage(item.getDosage())
            .frequency(item.getFrequency())
            .duration(item.getDuration() != null ? item.getDuration().toString() : null)
            .quantity(quantity)
            .quantityPerDose(item.getQuantityPerDose())
            .unitPrice(unitPrice)
            .totalPrice(unitPrice.multiply(BigDecimal.valueOf(quantity)))
            .stockQuantity(medication != null ? medication.getStockQuantity() : 0)
            .build();
    }

    // ══════════════════════════════════════════════════════════════════
    // PHARMACY PURCHASE WITH CASH BALANCE CHECK AND EXPENSE AUTO-CREATION
    // ══════════════════════════════════════════════════════════════════

    /**
     * Achète des médicaments auprès d'un fournisseur avec vérification du solde de caisse
     * et création automatique d'une dépense.
     * 
     * @param medicationId ID du médicament à acheter
     * @param quantity Quantité à acheter
     * @param unitPrice Prix d'achat unitaire
     * @param supplierId ID du fournisseur
     * @param pharmacistId ID du pharmacien qui fait l'achat
     * @return Le médicament mis à jour avec le nouveau stock
     * @throws RuntimeException si le solde de caisse est insuffisant
     */
    @Override
    @Transactional
    public MedicationDTO purchaseMedication(Long medicationId, Integer quantity, BigDecimal unitPrice, 
                                             Long supplierId, Long pharmacistId) {
        log.info("💊 [PHARMACY PURCHASE] Démarrage achat médicament ID: {}, Qté: {}, Prix unitaire: {}", 
                medicationId, quantity, unitPrice);
        
        // 1. Calculer le coût total
        BigDecimal totalCost = unitPrice.multiply(BigDecimal.valueOf(quantity));
        log.info("💰 Coût total de l'achat: {}", totalCost);
        
        // 2. Vérifier le solde de la caisse (revenus - dépenses)
        BigDecimal todayRevenue = revenueService.getTodayTotal();
        BigDecimal todayExpenses = expenseService.getTodayTotal();
        BigDecimal cashBalance = todayRevenue.subtract(todayExpenses);
        
        log.info("💰 Solde caisse actuel: {} (Revenus: {}, Dépenses: {})", 
                cashBalance, todayRevenue, todayExpenses);
        
        // 3. Vérifier si le solde est suffisant
        if (cashBalance.compareTo(totalCost) < 0) {
            log.error("❌ Solde insuffisant pour l'achat. Solde: {}, Coût: {}", cashBalance, totalCost);
            throw new RuntimeException(
                "Solde de caisse insuffisant pour cet achat. " +
                "Solde disponible: " + cashBalance + " CDF, " +
                "Coût de l'achat: " + totalCost + " CDF"
            );
        }
        
        // 4. Récupérer le médicament et le fournisseur
        Medication medication = medicationRepository.findById(medicationId)
            .orElseThrow(() -> new ResourceNotFoundException("Médicament non trouvé"));
        
        Supplier supplier = supplierId != null ? 
            supplierRepository.findById(supplierId).orElse(null) : null;
        
        User pharmacist = userRepository.findById(pharmacistId)
            .orElseThrow(() -> new ResourceNotFoundException("Pharmacien non trouvé"));
        
        // 5. Mettre à jour le stock
        Integer currentStock = medication.getStockQuantity() != null ? medication.getStockQuantity() : 0;
        Integer newStock = currentStock + quantity;
        medication.setStockQuantity(newStock);
        medication.setUnitPrice(unitPrice); // Mettre à jour le prix d'achat
        medication = medicationRepository.save(medication);
        
        log.info("✅ Stock mis à jour: {} → {} unités", currentStock, newStock);
        
        // 6. Créer automatiquement la dépense
        try {
            String supplierName = supplier != null ? supplier.getName() : "Fournisseur inconnu";
            String description = String.format(
                "Achat médicament: %s (Qté: %d) - Fournisseur: %s - Prix unitaire: %s CDF",
                medication.getName(), quantity, supplierName, unitPrice
            );
            
            ExpenseDTO expenseDTO = ExpenseDTO.builder()
                .amount(totalCost)
                .category(Expense.ExpenseCategory.PHARMACIE)
                .description(description)
                .date(LocalDateTime.now())
                .build();
            
            ExpenseDTO createdExpense = expenseService.createExpense(expenseDTO, pharmacistId);
            log.info("✅ Dépense créée automatiquement: ID={}, Montant={}", 
                    createdExpense.getId(), createdExpense.getAmount());
            
        } catch (Exception e) {
            log.error("❌ Erreur lors de la création de la dépense: {}", e.getMessage());
            // Ne pas bloquer l'achat si la création de dépense échoue, mais logger l'erreur
        }
        
        // 7. Envoyer une notification à la finance
        try {
            notifyFinanceOfPurchase(medication, quantity, totalCost, pharmacist);
        } catch (Exception e) {
            log.warn("⚠️ Erreur notification finance: {}", e.getMessage());
        }
        
        log.info("✅ Achat de médicament terminé avec succès");
        return mapMedicationToDTO(medication);
    }
    
    /**
     * Notifie la finance d'un nouvel achat de médicaments
     */
    private void notifyFinanceOfPurchase(Medication medication, Integer quantity, 
                                        BigDecimal totalCost, User pharmacist) {
        Notification notification = Notification.builder()
            .title("Nouvel achat médicament - Pharmacie")
            .message(String.format(
                "Achat de %d unités de %s pour %s CDF par %s %s",
                quantity,
                medication.getName(),
                totalCost,
                pharmacist.getFirstName(),
                pharmacist.getLastName()
            ))
            .type(NotificationType.SYSTEME)
            .user(pharmacist)
            .createdAt(LocalDateTime.now())
            .isRead(false)
            .build();
        
        notificationRepository.save(notification);
        log.info("📢 Notification envoyée à la finance pour l'achat de {}", medication.getName());
    }
    
    // ══════════════════════════════════════════════════════════════════
    // FINANCE NOTIFICATION FOR SALES
    // ══════════════════════════════════════════════════════════════════
    
    /**
     * Notifie la finance d'une nouvelle vente de médicaments
     * Cette méthode est appelée automatiquement lors d'une vente
     */
    @Override
    public void notifyFinanceOfSale(PharmacyOrder order, BigDecimal amountPaid, String paymentMethod) {
        try {
            String customerName = order.getCustomerName() != null ? 
                order.getCustomerName() : "Client anonyme";
            
            Notification notification = Notification.builder()
                .title("Nouvelle vente médicament - Pharmacie")
                .message(String.format(
                    "Vente de %s CDF (%s) - Client: %s - Commande: %s",
                    amountPaid,
                    paymentMethod,
                    customerName,
                    order.getOrderCode()
                ))
                .type(NotificationType.PAIEMENT_RECU)
                .user(order.getCreatedBy())
                .createdAt(LocalDateTime.now())
                .isRead(false)
                .build();
            
            notificationRepository.save(notification);
            log.info("📢 Notification de vente envoyée à la finance: Commande {}, Montant {}", 
                    order.getOrderCode(), amountPaid);
            
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi de la notification de vente: {}", e.getMessage());
        }
    }
    
    private MedicationDTO mapMedicationToDTO(Medication medication) {
        return MedicationDTO.builder()
            .id(medication.getId())
            .medicationCode(medication.getMedicationCode())
            .name(medication.getName())
            .genericName(medication.getGenericName())
            .description(medication.getDescription())
            .manufacturer(medication.getManufacturer())
            .supplier(medication.getSupplier())
            .category(medication.getCategory())
            .form(medication.getForm())
            .strength(medication.getStrength())
            .price(medication.getPrice())
            .unitPrice(medication.getUnitPrice())
            .stockQuantity(medication.getStockQuantity())
            .minimumStock(medication.getMinimumStock())
            .expiryDate(medication.getExpiryDate())
            .purchaseDate(medication.getPurchaseDate())
            .isActive(medication.getIsActive())
            .requiresPrescription(medication.getRequiresPrescription())
            .createdAt(medication.getCreatedAt())
            .updatedAt(medication.getUpdatedAt())
            .build();
    }
}
