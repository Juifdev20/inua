package com.hospital.backend.service;

import com.hospital.backend.entity.*;
import com.hospital.backend.repository.ConsultationRepository;
import com.hospital.backend.repository.InvoiceRepository;
import com.hospital.backend.repository.AdmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FinanceService {

    private final ConsultationRepository consultationRepository;
    private final InvoiceRepository invoiceRepository;
    private final AdmissionRepository admissionRepository;

    @Transactional
    public Map<String, Object> processPayment(Long consultationId, Map<String, Object> paymentData) {
        log.info("💰 [FINANCE SERVICE] Début traitement paiement - Consultation ID: {}", consultationId);
        log.info("📦 [FINANCE SERVICE] Données reçues: {}", paymentData);
        
        try {
            // 1. VÉRIFICATION EXISTENCE
            if (consultationId == null) {
                log.error("❌ [FINANCE SERVICE] ID consultation null");
                return Map.of(
                    "success", false,
                    "message", "ID de consultation invalide"
                );
            }
            
            Optional<Consultation> consultationOpt = consultationRepository.findById(consultationId);
            if (consultationOpt.isEmpty()) {
                log.error("❌ [FINANCE SERVICE] Consultation {} non trouvée", consultationId);
                return Map.of(
                    "success", false,
                    "message", "Consultation non trouvée avec ID: " + consultationId
                );
            }
            
            Consultation consultation = consultationOpt.get();
            log.info("✅ [FINANCE SERVICE] Consultation trouvée - ID: {}, Statut actuel: {}", 
                consultationId, consultation.getStatus());
            
            // 2. VÉRIFICATION STATUT DÉJÀ PAYÉ
            if (consultation.getStatus() == ConsultationStatus.PAYEE) {
                log.warn("⚠️ [FINANCE SERVICE] Consultation {} déjà payée", consultationId);
                return Map.of(
                    "success", false,
                    "message", "Cette consultation est déjà payée"
                );
            }
            
            // 3. EXTRACTION ET VALIDATION DONNÉES PAIEMENT
            String paymentMethod = paymentData != null ? (String) paymentData.get("paymentMethod") : "ESPECES";
            Object amountObj = paymentData != null ? paymentData.get("amountPaid") : null;
            
            BigDecimal amountPaid;
            if (amountObj == null) {
                // Si pas de montant fourni, utiliser le montant requis
                Double requiredAmount = calculateRequiredAmount(consultation);
                amountPaid = BigDecimal.valueOf(requiredAmount);
                log.info("💡 [FINANCE SERVICE] Montant non fourni, utilisation du montant requis: {}", amountPaid);
            } else {
                amountPaid = new BigDecimal(amountObj.toString());
            }
            
            if (amountPaid.compareTo(BigDecimal.ZERO) <= 0) {
                log.error("❌ [FINANCE SERVICE] Montant invalide: {}", amountPaid);
                return Map.of(
                    "success", false,
                    "message", "Le montant du paiement doit être supérieur à 0"
                );
            }
            
            log.info("💵 [FINANCE SERVICE] Montant à payer: {}, Méthode: {}", amountPaid, paymentMethod);
            
            // 4. MISE À JOUR CONSULTATION
            consultation.setStatus(ConsultationStatus.PAYEE);
            consultation.setStatut("PAYEE");
            
            // Mettre à jour les montants payés si les champs existent
            try {
                Double ficheDue = consultation.getFicheAmountDue();
                Double consulDue = consultation.getConsulAmountDue();
                
                if (ficheDue != null && ficheDue > 0) {
                    consultation.setFicheAmountPaid(ficheDue);
                }
                if (consulDue != null && consulDue > 0) {
                    consultation.setConsulAmountPaid(consulDue);
                }
            } catch (Exception e) {
                log.warn("⚠️ [FINANCE SERVICE] Erreur mise à jour montants: {}", e.getMessage());
            }
            
            Consultation savedConsultation = consultationRepository.save(consultation);
            log.info("✅ [FINANCE SERVICE] Consultation mise à jour - Nouveau statut: {}", savedConsultation.getStatus());
            
            // 5. MISE À JOUR OU CRÉATION FACTURE ASSOCIÉE
            updateOrCreateInvoice(consultation, amountPaid, paymentMethod);
            
            // 6. MISE À JOUR ADMISSION SI EXISTE (optionnel, ne bloque pas le paiement)
            try {
                Admission admission = consultation.getAdmission();
                if (admission != null && admission.getId() != null) {
                    admission.setAmountPaid(amountPaid);
                    admission.setPaymentMethod(paymentMethod);
                    admissionRepository.save(admission);
                    log.info("✅ [FINANCE SERVICE] Admission mise à jour - ID: {}", admission.getId());
                }
            } catch (Exception e) {
                log.warn("⚠️ [FINANCE SERVICE] Impossible de mettre à jour l'admission (optionnel): {}", e.getMessage());
                // Ne pas bloquer le paiement si l'admission ne peut pas être mise à jour
            }
            
            log.info("✅ [FINANCE SERVICE] Paiement complété avec succès - Consultation: {}", consultationId);
            
            return Map.of(
                "success", true,
                "message", "Paiement enregistré avec succès",
                "consultationId", consultationId,
                "paymentMethod", paymentMethod,
                "amountPaid", amountPaid,
                "newStatus", "PAYEE",
                "paidAt", LocalDateTime.now().toString()
            );
            
        } catch (NumberFormatException e) {
            log.error("❌ [FINANCE SERVICE] Erreur format numérique: {}", e.getMessage());
            return Map.of(
                "success", false,
                "message", "Format de montant invalide"
            );
        } catch (Exception e) {
            log.error("❌ [FINANCE SERVICE] ERREUR CRITIQUE: {}", e.getMessage(), e);
            e.printStackTrace();
            return Map.of(
                "success", false,
                "message", "Erreur lors du traitement du paiement: " + e.getMessage(),
                "errorType", e.getClass().getSimpleName()
            );
        }
    }
    
    private Double calculateRequiredAmount(Consultation consultation) {
        Double total = 0.0;
        
        if (consultation.getFicheAmountDue() != null) {
            total += consultation.getFicheAmountDue();
        }
        if (consultation.getConsulAmountDue() != null) {
            total += consultation.getConsulAmountDue();
        }
        if (consultation.getExamAmountPaid() != null) {
            total += consultation.getExamAmountPaid().doubleValue();
        }
        
        // Si aucun montant trouvé, utiliser un défaut
        if (total == 0.0) {
            total = 30.0; // Montant par défaut
        }
        
        return total;
    }
    
    private void updateOrCreateInvoice(Consultation consultation, BigDecimal amountPaid, String paymentMethod) {
        try {
            // Vérifier que le patient existe (nécessaire pour la facture)
            if (consultation.getPatient() == null) {
                log.warn("⚠️ [FINANCE SERVICE] Pas de patient associé à la consultation {}, facture non créée", 
                    consultation.getId());
                return;
            }
            
            // Chercher une facture existante
            Optional<Invoice> existingInvoice = invoiceRepository.findByConsultationId(consultation.getId());
            
            PaymentMethod method = parsePaymentMethod(paymentMethod);
            
            if (existingInvoice.isPresent()) {
                Invoice invoice = existingInvoice.get();
                invoice.setStatus(InvoiceStatus.PAYEE);
                invoice.setPaidAmount(amountPaid);
                invoice.setPaymentMethod(method);
                invoice.setPaidAt(LocalDateTime.now());
                
                invoiceRepository.save(invoice);
                log.info("✅ [FINANCE SERVICE] Facture existante mise à jour - ID: {}", invoice.getId());
            } else {
                // Créer une nouvelle facture
                Invoice newInvoice = new Invoice();
                newInvoice.setConsultation(consultation);
                newInvoice.setPatient(consultation.getPatient());
                newInvoice.setTotalAmount(amountPaid);
                newInvoice.setPaidAmount(amountPaid);
                newInvoice.setSubtotal(amountPaid);
                newInvoice.setStatus(InvoiceStatus.PAYEE);
                newInvoice.setPaymentMethod(method);
                newInvoice.setPaidAt(LocalDateTime.now());
                newInvoice.setCreatedAt(LocalDateTime.now());
                newInvoice.setInvoiceCode(generateInvoiceCode());
                
                invoiceRepository.save(newInvoice);
                log.info("✅ [FINANCE SERVICE] Nouvelle facture créée - ID: {}", newInvoice.getId());
            }
        } catch (Exception e) {
            log.error("❌ [FINANCE SERVICE] Erreur mise à jour facture: {}", e.getMessage());
            // Ne pas propager l'erreur pour ne pas bloquer le paiement
        }
    }
    
    private PaymentMethod parsePaymentMethod(String method) {
        if (method == null) return PaymentMethod.ESPECES;
        
        return switch (method.toUpperCase()) {
            case "ESPECES" -> PaymentMethod.ESPECES;
            case "CASH" -> PaymentMethod.CASH;
            case "CARTE", "CARTE_BANCAIRE" -> PaymentMethod.CARTE_BANCAIRE;
            case "VIREMENT" -> PaymentMethod.VIREMENT;
            case "CHEQUE" -> PaymentMethod.CHEQUE;
            case "ASSURANCE" -> PaymentMethod.ASSURANCE;
            case "MOBILE_MONEY" -> PaymentMethod.MOBILE_MONEY;
            default -> PaymentMethod.ESPECES;
        };
    }
    
    private String generateInvoiceCode() {
        return "INV-" + System.currentTimeMillis();
    }
}
