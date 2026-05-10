package com.hospital.backend.service;

import com.hospital.backend.entity.Consultation;
import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.repository.ConsultationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

/**
 * VERSION ULTRA-SIMPLIFIÉE - Diagnostic Erreur 500
 * Ne fait que changer le statut de la consultation en PAYEE
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SimpleFinanceService {

    private final ConsultationRepository consultationRepository;

    @Transactional
    public Map<String, Object> processSimplePayment(Long consultationId, Map<String, Object> paymentData) {
        log.info("==========================================");
        log.info("🚀 [SIMPLE PAYMENT] Démarrage - ID: {}", consultationId);
        log.info("📦 [SIMPLE PAYMENT] Données reçues: {}", paymentData);
        log.info("==========================================");
        
        try {
            // ÉTAPE 1: Vérifier l'ID
            if (consultationId == null) {
                log.error("❌ [SIMPLE PAYMENT] ID est null!");
                return Map.of("success", false, "message", "ID consultation invalide");
            }
            log.info("✅ [SIMPLE PAYMENT] ID valide: {}", consultationId);
            
            // ÉTAPE 2: Récupérer la consultation
            Optional<Consultation> opt = consultationRepository.findById(consultationId);
            if (opt.isEmpty()) {
                log.error("❌ [SIMPLE PAYMENT] Consultation {} non trouvée", consultationId);
                return Map.of("success", false, "message", "Consultation non trouvée");
            }
            log.info("✅ [SIMPLE PAYMENT] Consultation trouvée");
            
            Consultation consultation = opt.get();
            
            // ÉTAPE 3: Vérifier le statut actuel
            ConsultationStatus currentStatus = consultation.getStatus();
            log.info("📊 [SIMPLE PAYMENT] Statut actuel: {}", currentStatus);
            
            if (currentStatus == ConsultationStatus.PAYEE) {
                log.warn("⚠️ [SIMPLE PAYMENT] Déjà payée!");
                return Map.of("success", false, "message", "Déjà payée");
            }
            
            // ÉTAPE 4: Changer le statut (OPÉRATION CRITIQUE)
            log.info("📝 [SIMPLE PAYMENT] Changement statut -> PAYEE");
            consultation.setStatus(ConsultationStatus.PAYEE);
            consultation.setStatut("PAYEE"); // Compatibilité champ String
            
            // ÉTAPE 5: Sauvegarder
            log.info("💾 [SIMPLE PAYMENT] Sauvegarde en cours...");
            Consultation saved = consultationRepository.save(consultation);
            log.info("✅ [SIMPLE PAYMENT] Sauvegardé! Nouveau statut: {}", saved.getStatus());
            
            // Extraire le montant pour la réponse
            Object amountObj = paymentData != null ? paymentData.get("amountPaid") : null;
            BigDecimal amount = amountObj != null ? new BigDecimal(amountObj.toString()) : BigDecimal.ZERO;
            
            log.info("==========================================");
            log.info("✅ [SIMPLE PAYMENT] SUCCÈS TOTAL");
            log.info("==========================================");
            
            return Map.of(
                "success", true,
                "message", "Paiement enregistré avec succès",
                "consultationId", consultationId,
                "newStatus", "PAYEE",
                "amountPaid", amount
            );
            
        } catch (Exception e) {
            log.error("❌ [SIMPLE PAYMENT] ERREUR CRITIQUE!");
            log.error("❌ [SIMPLE PAYMENT] Type: {}", e.getClass().getSimpleName());
            log.error("❌ [SIMPLE PAYMENT] Message: {}", e.getMessage());
            log.error("❌ [SIMPLE PAYMENT] Stack trace:", e);
            
            return Map.of(
                "success", false,
                "message", "Erreur: " + e.getMessage(),
                "errorType", e.getClass().getSimpleName()
            );
        }
    }
}
