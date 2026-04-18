package com.hospital.backend.controller;

import com.hospital.backend.dto.*;
import com.hospital.backend.entity.*;
import com.hospital.backend.repository.StockMovementRepository;
import com.hospital.backend.service.PharmacyService;
import com.hospital.backend.service.PrescriptionService;
import com.hospital.backend.service.InvoiceService;
import com.hospital.backend.repository.UserRepository;
import com.hospital.backend.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/pharmacy", "/api/v1/pharmacy"})
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Pharmacy", description = "Gestion de la pharmacie hospitalière")
@CrossOrigin(origins = {"https://inuaafia.onrender.com", "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
public class PharmacyController {

    private final PharmacyService pharmacyService;
    private final PrescriptionService prescriptionService;
    private final InvoiceService invoiceService;
    private final UserRepository userRepository;
    private final StockMovementRepository stockMovementRepository;
    private final PasswordEncoder passwordEncoder;

    // ══════════════════════════════════════════════════════════════════
    // SALES HISTORY
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/sales/history")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Historique des ventes (ventes directes)")
    public ResponseEntity<PageResponse<PharmacyOrderDTO>> getSalesHistory(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean archived) {
        try {
            // Default to current month if no dates provided
            LocalDateTime start = startDate != null ? 
                LocalDateTime.parse(startDate + "T00:00:00") : 
                LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0);
            LocalDateTime end = endDate != null ? 
                LocalDateTime.parse(endDate + "T23:59:59") : 
                LocalDateTime.now();
            
            log.info("📅 [SALES HISTORY] Paramètres reçus - startDate: {}, endDate: {}, archived: {}", startDate, endDate, archived);
            log.info("📅 [SALES HISTORY] Dates parsées - start: {}, end: {}", start, end);
            
            Pageable pageable = PageRequest.of(page, size);
            PageResponse<PharmacyOrderDTO> sales = pharmacyService.getSalesHistory(start, end, pageable, archived);
            
            log.info("✅ [SALES HISTORY] {} ventes récupérées", sales.getTotalElements());
            return ResponseEntity.ok(sales);
        } catch (Exception e) {
            log.error("❌ [SALES HISTORY] Erreur: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // DASHBOARD
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/dashboard/stats")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Statistiques du dashboard pharmacie")
    public ResponseEntity<PharmacyDashboardStatsDTO> getDashboardStats() {
        try {
            PharmacyDashboardStatsDTO stats = pharmacyService.getDashboardStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Erreur récupération dashboard stats: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // ORDERS MANAGEMENT
    // ══════════════════════════════════════════════════════════════════

    @PostMapping("/orders")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Créer une nouvelle commande pharmacie")
    public ResponseEntity<PharmacyOrderDTO> createOrder(@Valid @RequestBody PharmacyOrderDTO orderDTO) {
        try {
            log.info("🔴 [CONTROLLER] OrderDTO reçu: customerName='{}', orderType='{}', items={}", 
                orderDTO.getCustomerName(), orderDTO.getOrderType(), 
                orderDTO.getItems() != null ? orderDTO.getItems().size() : 0);
            
            // VALIDATION: Customer name is required
            if (orderDTO.getCustomerName() == null || orderDTO.getCustomerName().trim().isEmpty()) {
                log.error("🔴 [CONTROLLER] ERREUR: customerName est null ou vide!");
                return ResponseEntity.badRequest().build();
            }
            
            PharmacyOrderDTO createdOrder = pharmacyService.createOrder(orderDTO);
            log.info("✅ [CONTROLLER] Commande créée: {} avec patientName='{}', customerName='{}'", 
                createdOrder.getOrderCode(), createdOrder.getPatientName(), createdOrder.getCustomerName());
            return ResponseEntity.ok(createdOrder);
        } catch (Exception e) {
            log.error("❌ [CONTROLLER] Erreur création commande: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/orders/{id}/archive")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Archiver ou désarchiver une commande")
    public ResponseEntity<PharmacyOrderDTO> toggleArchiveOrder(@PathVariable Long id) {
        try {
            PharmacyOrderDTO order = pharmacyService.getOrderById(id);
            if (order == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Toggle archived status
            Boolean newArchivedStatus = order.getArchived() == null ? true : !order.getArchived();
            order.setArchived(newArchivedStatus);
            
            // Update the order
            PharmacyOrderDTO updatedOrder = pharmacyService.updateOrder(id, order);
            
            String action = newArchivedStatus ? "archivée" : "désarchivée";
            log.info("✅ Commande {} {}", id, action);
            
            return ResponseEntity.ok(updatedOrder);
        } catch (Exception e) {
            log.error("❌ Erreur archivage commande {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/orders/{id}")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN', 'DOCTOR')")
    @Operation(summary = "Récupérer une commande par ID")
    public ResponseEntity<PharmacyOrderDTO> getOrderById(@PathVariable Long id) {
        try {
            PharmacyOrderDTO order = pharmacyService.getOrderById(id);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            log.error("Erreur récupération commande {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/orders/code/{orderCode}")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN', 'DOCTOR')")
    @Operation(summary = "Récupérer une commande par code")
    public ResponseEntity<PharmacyOrderDTO> getOrderByCode(@PathVariable String orderCode) {
        try {
            PharmacyOrderDTO order = pharmacyService.getOrderByCode(orderCode);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            log.error("Erreur récupération commande {}: {}", orderCode, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/orders/{id}")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Mettre à jour une commande")
    public ResponseEntity<PharmacyOrderDTO> updateOrder(
            @PathVariable Long id,
            @Valid @RequestBody PharmacyOrderDTO orderDTO) {
        try {
            PharmacyOrderDTO updatedOrder = pharmacyService.updateOrder(id, orderDTO);
            return ResponseEntity.ok(updatedOrder);
        } catch (Exception e) {
            log.error("Erreur mise à jour commande {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/orders")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN', 'DOCTOR')")
    @Operation(summary = "Lister les commandes par statut")
    public ResponseEntity<PageResponse<PharmacyOrderDTO>> getOrdersByStatus(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            List<PharmacyOrderStatus> statuses = status != null ?
                    List.of(PharmacyOrderStatus.valueOf(status)) :
                    List.of(PharmacyOrderStatus.EN_ATTENTE, PharmacyOrderStatus.EN_PREPARATION, PharmacyOrderStatus.PAYEE);

            PageResponse<PharmacyOrderDTO> orders = pharmacyService.getOrdersByStatus(statuses, pageable);
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            log.error("Erreur récupération commandes: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/orders/search")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN', 'DOCTOR')")
    @Operation(summary = "Rechercher des commandes")
    public ResponseEntity<PageResponse<PharmacyOrderDTO>> searchOrders(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            PageResponse<PharmacyOrderDTO> orders = pharmacyService.searchOrders(query, pageable);
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            log.error("Erreur recherche commandes: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/orders/pending")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Lister les commandes en attente")
    public ResponseEntity<List<PharmacyOrderDTO>> getPendingOrders() {
        try {
            List<PharmacyOrderDTO> orders = pharmacyService.getPendingOrders();
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            log.error("Erreur récupération commandes en attente: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // ORDER STATUS MANAGEMENT
    // ══════════════════════════════════════════════════════════════════

    @PutMapping("/orders/{id}/status")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Mettre à jour le statut d'une commande")
    public ResponseEntity<PharmacyOrderDTO> updateOrderStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> requestBody) {
        try {
            PharmacyOrderStatus status = PharmacyOrderStatus.valueOf(requestBody.get("status"));
            PharmacyOrderDTO updatedOrder = pharmacyService.updateOrderStatus(id, status);
            return ResponseEntity.ok(updatedOrder);
        } catch (Exception e) {
            log.error("Erreur mise à jour statut commande {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/orders/{id}/pay")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN', 'FINANCE')")
    @Operation(summary = "Traiter le paiement d'une commande")
    public ResponseEntity<PharmacyOrderDTO> processPayment(
            @PathVariable Long id,
            @RequestBody Map<String, Object> paymentData) {
        try {
            BigDecimal amountPaid = new BigDecimal(paymentData.get("amountPaid").toString());
            String paymentMethod = paymentData.get("paymentMethod").toString();
            Boolean allowPartialPayment = paymentData.containsKey("allowPartialPayment") 
                ? Boolean.valueOf(paymentData.get("allowPartialPayment").toString()) 
                : false;
            
            PharmacyOrderDTO updatedOrder = pharmacyService.processPayment(id, amountPaid, paymentMethod, allowPartialPayment);
            log.info("Paiement traité pour commande {}: {} {} (partial: {})", id, amountPaid, paymentMethod, allowPartialPayment);
            return ResponseEntity.ok(updatedOrder);
        } catch (Exception e) {
            log.error("Erreur paiement commande {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/orders/{id}/dispense")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Dispenser une commande")
    public ResponseEntity<PharmacyOrderDTO> dispenseOrder(
            @PathVariable Long id,
            @RequestBody Map<String, Long> requestBody) {
        try {
            Long pharmacistId = requestBody.get("pharmacistId");
            PharmacyOrderDTO dispensedOrder = pharmacyService.dispenseOrder(id, pharmacistId);
            log.info("Commande {} dispensée par pharmacien {}", id, pharmacistId);
            return ResponseEntity.ok(dispensedOrder);
        } catch (Exception e) {
            log.error("Erreur dispensation commande {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/orders/{id}/validate")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Valider une commande")
    public ResponseEntity<PharmacyOrderDTO> validateOrder(@PathVariable Long id) {
        try {
            PharmacyOrderDTO validatedOrder = pharmacyService.validateOrder(id);
            return ResponseEntity.ok(validatedOrder);
        } catch (Exception e) {
            log.error("Erreur validation commande {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/orders/{id}/cancel")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Annuler une commande")
    public ResponseEntity<PharmacyOrderDTO> cancelOrder(
            @PathVariable Long id,
            @RequestBody Map<String, String> requestBody) {
        try {
            String reason = requestBody.get("reason");
            PharmacyOrderDTO cancelledOrder = pharmacyService.cancelOrder(id, reason);
            return ResponseEntity.ok(cancelledOrder);
        } catch (Exception e) {
            log.error("Erreur annulation commande {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // ORDER ITEMS
    // ══════════════════════════════════════════════════════════════════

    @PostMapping("/orders/{orderId}/items")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Ajouter un item à une commande")
    public ResponseEntity<PharmacyOrderItemDTO> addOrderItem(
            @PathVariable Long orderId,
            @Valid @RequestBody PharmacyOrderItemDTO itemDTO) {
        try {
            PharmacyOrderItemDTO item = pharmacyService.addOrderItem(orderId, itemDTO);
            return ResponseEntity.ok(item);
        } catch (Exception e) {
            log.error("Erreur ajout item commande {}: {}", orderId, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/orders/items/{itemId}")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Mettre à jour un item de commande")
    public ResponseEntity<PharmacyOrderItemDTO> updateOrderItem(
            @PathVariable Long itemId,
            @Valid @RequestBody PharmacyOrderItemDTO itemDTO) {
        try {
            PharmacyOrderItemDTO updatedItem = pharmacyService.updateOrderItem(itemId, itemDTO);
            return ResponseEntity.ok(updatedItem);
        } catch (Exception e) {
            log.error("Erreur mise à jour item {}: {}", itemId, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/orders/items/{itemId}")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Supprimer un item de commande")
    public ResponseEntity<Void> removeOrderItem(@PathVariable Long itemId) {
        try {
            pharmacyService.removeOrderItem(itemId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erreur suppression item {}: {}", itemId, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // STOCK MANAGEMENT
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/stock/check/{medicationId}")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN', 'DOCTOR')")
    @Operation(summary = "Vérifier le stock d'un médicament")
    public ResponseEntity<Map<String, Object>> checkMedicationStock(
            @PathVariable Long medicationId,
            @RequestParam Integer requiredQuantity) {
        try {
            boolean available = pharmacyService.checkMedicationStock(medicationId, requiredQuantity);
            return ResponseEntity.ok(Map.of(
                    "available", available,
                    "requiredQuantity", requiredQuantity,
                    "medicationId", medicationId
            ));
        } catch (Exception e) {
            log.error("Erreur vérification stock médicament {}: {}", medicationId, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/stock/{medicationId}")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Mettre à jour le stock d'un médicament")
    public ResponseEntity<Void> updateMedicationStock(
            @PathVariable Long medicationId,
            @RequestParam Integer quantityChange) {
        try {
            pharmacyService.updateMedicationStock(medicationId, quantityChange);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erreur mise à jour stock médicament {}: {}", medicationId, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/stock/alerts")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Lister les alertes de stock")
    public ResponseEntity<List<MedicationStockAlertDTO>> getStockAlerts() {
        try {
            List<MedicationStockAlertDTO> alerts = pharmacyService.getStockAlerts();
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            log.error("Erreur récupération alertes stock: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/orders/unpaid")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN', 'FINANCE')")
    @Operation(summary = "Lister les commandes impayées")
    public ResponseEntity<List<PharmacyOrderDTO>> getUnpaidOrders() {
        try {
            List<PharmacyOrderDTO> orders = pharmacyService.getUnpaidOrders();
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            log.error("Erreur récupération commandes impayées: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // PRESCRIPTIONS MANAGEMENT
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/prescriptions/pending")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN')")
    @Operation(summary = "Lister les prescriptions médicales en attente de traitement")
    public ResponseEntity<List<PrescriptionDTO>> getPendingPrescriptions() {
        try {
            log.info("Récupération des prescriptions en attente pour la pharmacie");
            List<PrescriptionDTO> prescriptions = prescriptionService.getPendingPrescriptions();
            return ResponseEntity.ok(prescriptions);
        } catch (Exception e) {
            log.error("Erreur récupération prescriptions en attente: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/prescriptions/{prescriptionId}")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN')")
    @Operation(summary = "Récupérer une prescription par ID")
    public ResponseEntity<PrescriptionDTO> getPrescriptionById(@PathVariable Long prescriptionId) {
        try {
            PrescriptionDTO prescription = prescriptionService.getById(prescriptionId);
            return ResponseEntity.ok(prescription);
        } catch (Exception e) {
            log.error("Erreur récupération prescription {}: {}", prescriptionId, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/prescriptions/{prescriptionId}/convert")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN')")
    @Operation(summary = "Convertir une prescription médicale en commande pharmacie")
    public ResponseEntity<PharmacyOrderDTO> convertPrescriptionToOrder(
            @PathVariable Long prescriptionId,
            @RequestBody(required = false) Map<String, Object> options) {
        try {
            PharmacyOrderDTO order = pharmacyService.convertPrescriptionToOrder(prescriptionId, options);
            log.info("Prescription {} convertie en commande pharmacie: {}", prescriptionId, order.getOrderCode());
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            log.error("Erreur conversion prescription {}: {}", prescriptionId, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/prescriptions/{prescriptionId}/validate")
    @PreAuthorize("hasAnyAuthority('ROLE_PHARMACIE', 'ROLE_PHARMACY', 'ROLE_ADMIN')")
    @Operation(summary = "Valider une prescription médicale et créer la facture automatiquement")
    public ResponseEntity<?> validatePrescription(
            @PathVariable Long prescriptionId,
            @RequestBody(required = false) Map<String, Object> validationData) {
        try {
            log.info("🔍 [DEBUG] Validation de la prescription {} avec création automatique de facture", prescriptionId);
            log.info("🔍 [DEBUG] Données de validation reçues: {}", validationData);
            
            // 1. Mettre à jour les items si des données sont fournies
            if (validationData != null && validationData.containsKey("items")) {
                log.info("🔍 [DEBUG] Mise à jour des items de la prescription avant validation");
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> items = (List<Map<String, Object>>) validationData.get("items");
                prescriptionService.updateItems(prescriptionId, items);
            }
            
            // 2. Valider la prescription
            PrescriptionDTO validatedPrescription = prescriptionService.updateStatus(prescriptionId, PrescriptionStatus.VALIDEE);
            log.info("✅ [DEBUG] Prescription {} validée avec succès", prescriptionId);
            
            // 3. Générer automatiquement la facture pour la caisse
            try {
                log.info("🔧 [DEBUG] Génération automatique de la facture pour prescription {}", prescriptionId);
                InvoiceDTO invoice = invoiceService.generateInvoice(prescriptionId);
                
                log.info("✅ [DEBUG] Facture {} générée avec succès - Patient: {} - Montant: {} - Statut: {}", 
                    invoice.getInvoiceCode(), invoice.getPatientName(), invoice.getTotalAmount(), invoice.getStatus());
                
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "prescription", validatedPrescription,
                    "invoice", invoice,
                    "message", "Facture n°" + invoice.getInvoiceCode() + " envoyée à la caisse"
                ));
            } catch (Exception e) {
                log.error("❌ [DEBUG] Erreur génération facture pour prescription {}: {}", prescriptionId, e.getMessage(), e);
                // Retourner une erreur pour que le frontend sache que ça a échoué
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "Erreur création facture",
                    "message", e.getMessage(),
                    "prescription", validatedPrescription
                ));
            }
        } catch (Exception e) {
            log.error("❌ [DEBUG] Erreur validation prescription {}: {}", prescriptionId, e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Erreur lors de la validation",
                "message", e.getMessage()
            ));
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // SUPPLIER MANAGEMENT
    // ══════════════════════════════════════════════════════════════════

    @PostMapping("/suppliers")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Créer un fournisseur")
    public ResponseEntity<SupplierDTO> createSupplier(@Valid @RequestBody SupplierDTO supplierDTO) {
        try {
            SupplierDTO createdSupplier = pharmacyService.createSupplier(supplierDTO);
            log.info("Fournisseur créé: {}", createdSupplier.getName());
            return ResponseEntity.ok(createdSupplier);
        } catch (Exception e) {
            log.error("Erreur création fournisseur: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/suppliers/{id}")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Récupérer un fournisseur par ID")
    public ResponseEntity<SupplierDTO> getSupplierById(@PathVariable Long id) {
        try {
            SupplierDTO supplier = pharmacyService.getSupplierById(id);
            return ResponseEntity.ok(supplier);
        } catch (Exception e) {
            log.error("Erreur récupération fournisseur {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/suppliers/{id}")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Mettre à jour un fournisseur")
    public ResponseEntity<SupplierDTO> updateSupplier(
            @PathVariable Long id,
            @Valid @RequestBody SupplierDTO supplierDTO) {
        try {
            SupplierDTO updatedSupplier = pharmacyService.updateSupplier(id, supplierDTO);
            return ResponseEntity.ok(updatedSupplier);
        } catch (Exception e) {
            log.error("Erreur mise à jour fournisseur {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/suppliers")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Lister les fournisseurs actifs")
    public ResponseEntity<List<SupplierDTO>> getActiveSuppliers() {
        try {
            List<SupplierDTO> suppliers = pharmacyService.getActiveSuppliers();
            return ResponseEntity.ok(suppliers);
        } catch (Exception e) {
            log.error("Erreur récupération fournisseurs actifs: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/stock/movements/{medicationId}")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Historique des mouvements de stock d'un médicament")
    public ResponseEntity<?> getStockMovements(@PathVariable Long medicationId) {
        try {
            log.info("Récupération de l'historique des mouvements pour le médicament {}", medicationId);
            List<StockMovement> movements = stockMovementRepository.findByMedicationIdOrderByCreatedAtDesc(medicationId);
            
            List<Map<String, Object>> result = movements.stream().map(m -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", m.getId());
                map.put("quantityChange", m.getQuantityChange());
                map.put("previousStock", m.getPreviousStock());
                map.put("newStock", m.getNewStock());
                map.put("movementType", m.getMovementType());
                map.put("referenceType", m.getReferenceType());
                map.put("referenceId", m.getReferenceId());
                map.put("notes", m.getNotes());
                map.put("createdAt", m.getCreatedAt());
                return map;
            }).collect(Collectors.toList());
            
            log.info("✅ {} mouvements trouvés pour le médicament {}", movements.size(), medicationId);
            return ResponseEntity.ok(Map.of(
                "medicationId", medicationId,
                "movements", result,
                "count", movements.size()
            ));
        } catch (Exception e) {
            log.error("Erreur récupération mouvements stock: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ═════════════════════════════════════════════════════════════════
    // RAPPORTS PHARMACIE - Reports Endpoints
    // ═════════════════════════════════════════════════════════════════

    @GetMapping("/reports/generate")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Générer un rapport complet de pharmacie")
    public ResponseEntity<PharmacyReportDTO> generateReport(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(defaultValue = "SALES") String reportType) {
        try {
            LocalDateTime start = startDate != null ? 
                LocalDateTime.parse(startDate + "T00:00:00") : 
                LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0);
            LocalDateTime end = endDate != null ? 
                LocalDateTime.parse(endDate + "T23:59:59") : 
                LocalDateTime.now();
            
            log.info("📊 [REPORT] Requête de rapport {} du {} au {}", reportType, startDate, endDate);
            
            PharmacyReportDTO report = pharmacyService.generateReport(start, end, reportType);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            log.error("❌ [REPORT] Erreur génération rapport: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/reports/sales-evolution")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Évolution des ventes pour le graphique")
    public ResponseEntity<List<SalesEvolutionDTO>> getSalesEvolution(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(defaultValue = "day") String groupBy) {
        try {
            LocalDateTime start = startDate != null ? 
                LocalDateTime.parse(startDate + "T00:00:00") : 
                LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0);
            LocalDateTime end = endDate != null ? 
                LocalDateTime.parse(endDate + "T23:59:59") : 
                LocalDateTime.now();
            
            List<SalesEvolutionDTO> evolution = pharmacyService.getSalesEvolution(start, end, groupBy);
            return ResponseEntity.ok(evolution);
        } catch (Exception e) {
            log.error("❌ [REPORT] Erreur évolution des ventes: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/reports/top-products")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Top produits vendus")
    public ResponseEntity<List<TopProductDTO>> getTopProducts(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(defaultValue = "5") Integer limit) {
        try {
            LocalDateTime start = startDate != null ? 
                LocalDateTime.parse(startDate + "T00:00:00") : 
                LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0);
            LocalDateTime end = endDate != null ? 
                LocalDateTime.parse(endDate + "T23:59:59") : 
                LocalDateTime.now();
            
            List<TopProductDTO> products = pharmacyService.getTopProducts(start, end, limit);
            return ResponseEntity.ok(products);
        } catch (Exception e) {
            log.error("❌ [REPORT] Erreur top produits: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/reports/payment-methods")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Répartition des méthodes de paiement")
    public ResponseEntity<List<PaymentMethodDTO>> getPaymentMethods(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        try {
            LocalDateTime start = startDate != null ? 
                LocalDateTime.parse(startDate + "T00:00:00") : 
                LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0);
            LocalDateTime end = endDate != null ? 
                LocalDateTime.parse(endDate + "T23:59:59") : 
                LocalDateTime.now();
            
            List<PaymentMethodDTO> methods = pharmacyService.getPaymentMethodsDistribution(start, end);
            return ResponseEntity.ok(methods);
        } catch (Exception e) {
            log.error("❌ [REPORT] Erreur méthodes de paiement: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/reports/financial")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Analyse financière")
    public ResponseEntity<List<FinancialPeriodDTO>> getFinancialAnalysis(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        try {
            LocalDateTime start = startDate != null ? 
                LocalDateTime.parse(startDate + "T00:00:00") : 
                LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0);
            LocalDateTime end = endDate != null ? 
                LocalDateTime.parse(endDate + "T23:59:59") : 
                LocalDateTime.now();
            
            List<FinancialPeriodDTO> analysis = pharmacyService.getFinancialAnalysis(start, end);
            return ResponseEntity.ok(analysis);
        } catch (Exception e) {
            log.error("❌ [REPORT] Erreur analyse financière: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // PASSWORD MANAGEMENT
    // ══════════════════════════════════════════════════════════════════

    @PutMapping("/profile/password")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Changer le mot de passe")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> passwordData) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = auth.getName();
            log.info("🔐 [PHARMACY] Demande de changement de mot de passe pour: {}", username);
            
            String currentPassword = passwordData.get("currentPassword");
            String newPassword = passwordData.get("newPassword");
            
            if (currentPassword == null || newPassword == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Le mot de passe actuel et le nouveau sont requis"
                ));
            }
            
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            
            if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                log.warn("⚠️ [PHARMACY] Mot de passe actuel incorrect pour: {}", username);
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Le mot de passe actuel est incorrect"
                ));
            }
            
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            
            log.info("✅ [PHARMACY] Mot de passe changé avec succès pour: {}", username);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Mot de passe changé avec succès"
            ));
        } catch (Exception e) {
            log.error("❌ [PHARMACY] Erreur changement mot de passe: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Erreur lors du changement de mot de passe"
            ));
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // PHARMACY PURCHASE WITH CASH BALANCE CHECK
    // ══════════════════════════════════════════════════════════════════

    @PostMapping("/medications/{medicationId}/purchase")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Acheter des médicaments avec vérification du solde de caisse")
    public ResponseEntity<?> purchaseMedication(
            @PathVariable Long medicationId,
            @RequestBody Map<String, Object> purchaseData) {
        try {
            Integer quantity = (Integer) purchaseData.get("quantity");
            Object priceObj = purchaseData.get("unitPrice");
            BigDecimal unitPrice = priceObj != null ? new BigDecimal(priceObj.toString()) : BigDecimal.ZERO;
            Long supplierId = purchaseData.get("supplierId") != null ? 
                Long.valueOf(purchaseData.get("supplierId").toString()) : null;
            
            Long pharmacistId = getCurrentUserId();
            
            log.info("💊 [PHARMACY PURCHASE] Achat médicament ID: {}, Qté: {}, Prix: {}, Fournisseur: {}", 
                    medicationId, quantity, unitPrice, supplierId);
            
            MedicationDTO updatedMedication = pharmacyService.purchaseMedication(
                    medicationId, quantity, unitPrice, supplierId, pharmacistId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Achat effectué avec succès",
                "medication", updatedMedication,
                "purchasedQuantity", quantity,
                "unitPrice", unitPrice
            ));
            
        } catch (RuntimeException e) {
            log.error("❌ [PHARMACY PURCHASE] Erreur: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("❌ [PHARMACY PURCHASE] Erreur inattendue: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Erreur lors de l'achat: " + e.getMessage()
            ));
        }
    }

    private Long getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
                CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
                return userDetails.getUser().getId();
            }
            // Fallback: chercher dans la base par nom d'utilisateur
            String username = auth != null ? auth.getName() : null;
            if (username != null) {
                return userRepository.findByUsername(username)
                    .map(User::getId)
                    .orElse(1L);
            }
        } catch (Exception e) {
            log.warn("⚠️ Impossible de récupérer l'ID utilisateur: {}", e.getMessage());
        }
        return 1L; // Valeur par défaut
    }

    // ══════════════════════════════════════════════════════════════════
    // EXPIRY ALERTS
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/inventory/expiry-alerts")
    @PreAuthorize("hasAnyRole('PHARMACY', 'PHARMACIE', 'ADMIN')")
    @Operation(summary = "Alertes de péremption")
    public ResponseEntity<?> getExpiryAlerts(@RequestParam(defaultValue = "30") int days) {
        try {
            log.info("📅 [PHARMACY] Récupération des alertes de péremption ({} jours)", days);
            
            // Pour l'instant, retourner une liste vide - l'implémentation complète
            // nécessiterait une table d'inventaire avec dates d'expiration
            List<Map<String, Object>> alerts = List.of(); // Empty list as placeholder
            
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            log.error("❌ [PHARMACY] Erreur alertes péremption: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
