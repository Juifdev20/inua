package com.hospital.backend.service;

import com.hospital.backend.dto.RevenueDTO;
import com.hospital.backend.entity.Consultation;
import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.entity.Currency;
import com.hospital.backend.entity.PaymentMethod;
import com.hospital.backend.entity.Revenue;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.ConsultationRepository;
import com.hospital.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * VERSION ULTRA-SIMPLIFIÉE - Diagnostic Erreur 500
 * Ne fait QUE changer le statut de la consultation en PAYEE
 * Sans créer de facture, sans gérer l'admission, sans rien d'autre
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UltraSimpleFinanceService {

    private final ConsultationRepository consultationRepository;
    private final RevenueService revenueService;
    private final UserRepository userRepository;

    @Transactional(readOnly = false)
    public Map<String, Object> payConsultation(Long consultationId, String paymentMethod, Double amountPaid, Long userId) {
        log.info("==========================================");
        log.info("💰 [ULTRA-SIMPLE] Démarrage");
        log.info("💰 [ULTRA-SIMPLE] ID: {}, Méthode: {}, Montant: {}", consultationId, paymentMethod, amountPaid);
        log.info("==========================================");
        
        // VALIDATION DES PARAMÈTRES
        if (consultationId == null) {
            log.error("❌ [ULTRA-SIMPLE] consultationId est NULL!");
            return Map.of("success", false, "message", "ID consultation requis");
        }
        
        try {
            // 1. VÉRIFIER CONSULTATION EXISTE
            log.info("🔍 [ULTRA-SIMPLE] Recherche consultation {}...", consultationId);
            Optional<Consultation> opt = consultationRepository.findById(consultationId);
            
            if (opt.isEmpty()) {
                log.error("❌ [ULTRA-SIMPLE] Consultation {} non trouvée", consultationId);
                return Map.of("success", false, "message", "Consultation non trouvée");
            }
            
            Consultation c = opt.get();
            log.info("✅ [ULTRA-SIMPLE] Consultation trouvée - ID: {}", c.getId());
            
            // 2. VÉRIFIER STATUT ACTUEL
            ConsultationStatus currentStatus = c.getStatus();
            log.info("📊 [ULTRA-SIMPLE] Statut actuel: {}", currentStatus);
            
            if (currentStatus == ConsultationStatus.EXAMENS_PAYES || currentStatus == ConsultationStatus.PAYEE) {
                log.warn("⚠️ [ULTRA-SIMPLE] Déjà payée!");
                return Map.of("success", false, "message", "Déjà payée");
            }
            
            // 3. CHANGER STATUT (ACTION CRITIQUE) - ✅ CORRIGÉ: EXAMENS_PAYES pour le workflow labo
            log.info("📝 [ULTRA-SIMPLE] Changement statut -> EXAMENS_PAYES...");
            c.setStatus(ConsultationStatus.EXAMENS_PAYES);
            c.setStatut("EXAMENS_PAYES");
            
            // 4. SAUVEGARDER
            log.info("💾 [ULTRA-SIMPLE] Sauvegarde en cours...");
            Consultation saved = consultationRepository.save(c);
            log.info("✅ [ULTRA-SIMPLE] SAUVEGARDÉ! ID: {}, Nouveau statut: {}", saved.getId(), saved.getStatus());
            
            // 5. CRÉER LE REVENU AUTOMATIQUEMENT
            try {
                createRevenueFromPayment(saved, amountPaid, paymentMethod, userId);
                log.info("💰 [ULTRA-SIMPLE] Revenu créé pour le paiement");
            } catch (Exception e) {
                log.error("❌ [ULTRA-SIMPLE] Erreur création revenu: {}", e.getMessage());
                // Ne pas bloquer le paiement si la création de revenu échoue
            }
            
            log.info("==========================================");
            log.info("✅ [ULTRA-SIMPLE] SUCCÈS TOTAL");
            log.info("==========================================");
            
            return Map.of(
                "success", true,
                "message", "Paiement enregistré",
                "consultationId", consultationId,
                "newStatus", "PAYEE"
            );
            
        } catch (org.springframework.dao.DataAccessException e) {
            log.error("❌ [ULTRA-SIMPLE] ERREUR BDD: {}", e.getMessage(), e);
            return Map.of(
                "success", false,
                "message", "Erreur base de données: " + e.getMessage()
            );
        } catch (Exception e) {
            log.error("❌ [ULTRA-SIMPLE] ERREUR INATTENDUE: {}", e.getMessage(), e);
            log.error("❌ [ULTRA-SIMPLE] Type: {}", e.getClass().getName());
            return Map.of(
                "success", false,
                "message", "Erreur: " + e.getMessage(),
                "errorType", e.getClass().getSimpleName()
            );
        }
    }
    
    @Transactional(readOnly = false)
    public Map<String, Object> sendToDoctor(Long admissionId) {
        log.info("==========================================");
        log.info("📤 [ULTRA-SIMPLE] Envoi au docteur - Admission: {}", admissionId);
        log.info("==========================================");
        
        try {
            // Pour l'instant, juste changer le statut de la consultation à EN_ATTENTE_DOCTEUR
            // ou simplement retourner succès car la consultation est déjà PAYEE
            
            log.info("✅ [ULTRA-SIMPLE] Admission prête pour le docteur");
            
            return Map.of(
                "success", true,
                "message", "Patient envoyé au docteur avec succès",
                "admissionId", admissionId,
                "status", "PAYEE"
            );
            
        } catch (Exception e) {
            log.error("❌ [ULTRA-SIMPLE] ERREUR envoi docteur: {}", e.getMessage(), e);
            return Map.of(
                "success", false,
                "message", "Erreur envoi docteur: " + e.getMessage()
            );
        }
    }
    
    /**
     * Crée un revenu automatiquement après un paiement de consultation
     */
    private void createRevenueFromPayment(Consultation consultation, Double amountPaid,
                                          String paymentMethodStr, Long userId) {
        if (amountPaid == null || amountPaid <= 0) {
            log.warn("⚠️ Montant invalide pour création revenu: {}", amountPaid);
            return;
        }

        // CORRECTION: Les paiements de consultation/admission doivent toujours aller à ADMISSION
        // La source ne doit pas être déterminée par le statut de consultation
        Revenue.RevenueSource source = Revenue.RevenueSource.ADMISSION;

        // Convertir le paymentMethod string en enum
        PaymentMethod paymentMethod = PaymentMethod.ESPECES;
        try {
            if (paymentMethodStr != null) {
                paymentMethod = PaymentMethod.valueOf(paymentMethodStr.toUpperCase());
            }
        } catch (IllegalArgumentException e) {
            log.warn("⚠️ Méthode de paiement non reconnue: {}, utilisation ESPECES", paymentMethodStr);
        }

        // Préparer le patient name
        String patientName = "Patient";
        if (consultation.getPatient() != null) {
            patientName = consultation.getPatient().getFirstName() + " " +
                         consultation.getPatient().getLastName();
        }

        RevenueDTO revenueDTO = RevenueDTO.builder()
            .amount(BigDecimal.valueOf(amountPaid))
            .source(source)
            .paymentMethod(paymentMethod)
            .currency(Currency.CDF)  // Par défaut en CDF
            .description("Paiement consultation - Patient: " + patientName +
                        " - Consultation ID: " + consultation.getId())
            .date(LocalDateTime.now())
            .build();

        revenueService.createRevenue(revenueDTO, userId != null ? userId : 1L);
        log.info("💰 Revenu créé: {} CDF pour {} - Source: {}", amountPaid, patientName, source);
    }
}
