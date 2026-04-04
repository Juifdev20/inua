package com.hospital.backend.service.impl;

import com.hospital.backend.dto.InvoiceDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.PrescriptionInvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Implémentation du service de liaison Prescription → Facture
 * Flux : Prescription VALIDEE → Facture EN_ATTENTE → File d'attente Finance
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionInvoiceServiceImpl implements PrescriptionInvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final MedicationRepository medicationRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public InvoiceDTO generateInvoiceFromPrescription(Prescription prescription) {
        log.info("🏥 Génération facture pour prescription: {}", prescription.getPrescriptionCode());
        
        // 1. Calculer le montant total
        BigDecimal totalAmount = calculatePrescriptionTotal(prescription.getId());
        
        if (totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Le montant total de la prescription ne peut pas être nul ou négatif");
        }
        
        // 2. Récupérer l'utilisateur système (créateur de la facture)
        User systemUser = userRepository.findById(1L)
            .orElseThrow(() -> new RuntimeException("Utilisateur système (ID 1) non trouvé"));
        
        // 3. Créer la facture
        Invoice invoice = Invoice.builder()
            .invoiceCode("INV-PHARM-" + System.currentTimeMillis())
            .patient(prescription.getPatient())
            .consultation(prescription.getConsultation())
            .prescription(prescription)
            .status(InvoiceStatus.EN_ATTENTE)
            .totalAmount(totalAmount)
            .paidAmount(BigDecimal.ZERO)
            .departmentSource(DepartmentSource.PHARMACY)
            .createdBy(systemUser)
            .createdAt(LocalDateTime.now())
            .build();
        
        // 4. Sauvegarder la facture
        invoice = invoiceRepository.save(invoice);
        
        log.info("✅ Facture créée: {} - Montant: {} - Patient: {}", 
            invoice.getInvoiceCode(), totalAmount, prescription.getPatient().getFirstName());
        
        // 5. Retourner le DTO
        return mapToDTO(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculatePrescriptionTotal(Long prescriptionId) {
        log.debug("💰 Calcul montant total pour prescription ID: {}", prescriptionId);
        
        List<PrescriptionItem> items = prescriptionItemRepository.findByPrescriptionId(prescriptionId);
        
        BigDecimal total = items.stream()
            .map(item -> {
                if (item.getMedication() == null) {
                    log.warn("⚠️ Médicament NULL pour item ID: {}", item.getId());
                    return BigDecimal.ZERO;
                }
                
                BigDecimal unitPrice = item.getMedication().getUnitPrice();
                if (unitPrice == null) {
                    log.warn("⚠️ Prix unitaire NULL pour médicament: {}", item.getMedication().getName());
                    return BigDecimal.ZERO;
                }
                
                Integer quantity = item.getQuantity() != null ? item.getQuantity() : 0;
                BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
                
                log.debug("📊 Item: {} - Prix: {} - Qté: {} - Total: {}", 
                    item.getMedication().getName(), unitPrice, quantity, itemTotal);
                
                return itemTotal;
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        log.info("💰 Montant total calculé pour prescription {}: {}", prescriptionId, total);
        return total;
    }

    private InvoiceDTO mapToDTO(Invoice invoice) {
        return InvoiceDTO.builder()
            .id(invoice.getId())
            .invoiceCode(invoice.getInvoiceCode())
            .patientId(invoice.getPatient() != null ? invoice.getPatient().getId() : null)
            .patientName(invoice.getPatient() != null 
                ? invoice.getPatient().getFirstName() + " " + invoice.getPatient().getLastName() 
                : "Patient inconnu")
            .consultationId(invoice.getConsultation() != null ? invoice.getConsultation().getId() : null)
            .prescriptionId(invoice.getPrescription() != null ? invoice.getPrescription().getId() : null)
            .totalAmount(invoice.getTotalAmount())
            .paidAmount(invoice.getPaidAmount())
            .status(invoice.getStatus())
            .departmentSource(invoice.getDepartmentSource())
            .createdByName(invoice.getCreatedBy() != null ? invoice.getCreatedBy().getUsername() : null)
            .createdAt(invoice.getCreatedAt())
            .build();
    }
}
