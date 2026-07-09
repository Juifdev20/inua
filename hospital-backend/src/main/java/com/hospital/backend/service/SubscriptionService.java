package com.hospital.backend.service;

import com.hospital.backend.dto.PaymentRequestDTO;
import com.hospital.backend.dto.SubscriptionPaymentDTO;
import com.hospital.backend.dto.SubscriptionSettingsDTO;
import com.hospital.backend.entity.Hospital;
import com.hospital.backend.entity.SubscriptionPayment;
import com.hospital.backend.entity.SubscriptionSettings;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface SubscriptionService {

    // ── Réglages (superadmin) ──
    SubscriptionSettings getSettingsEntity();
    SubscriptionSettingsDTO getSettings();
    SubscriptionSettingsDTO updateSettings(SubscriptionSettingsDTO dto);

    /** Tarifs publics calculés (par plan, mensuel/annuel) + devise + jours d'essai. */
    Map<String, Object> getPublicPricing();

    /** Prix pour un plan + période donnés. */
    BigDecimal computePrice(String plan, String period);

    // ── Paiements (simulation) ──
    SubscriptionPayment submitPayment(PaymentRequestDTO req);
    List<SubscriptionPaymentDTO> getPaymentsForHospital(Long hospitalId);
    List<SubscriptionPaymentDTO> getPendingPayments();
    long countPendingPayments();

    /** Confirme un paiement : applique la période à l'abonnement de l'hôpital. */
    SubscriptionPayment confirmPayment(Long paymentId, String confirmedBy);
    SubscriptionPayment rejectPayment(Long paymentId, String reason);

    // ── Cycle de vie de l'abonnement ──
    /** Démarre l'essai gratuit (si configuré) OU met en attente de paiement. Appelé à l'approbation. */
    void startTrialOrPending(Hospital hospital);

    /**
     * Automatisation à l'inscription : si l'essai est activé ET l'auto-approbation active,
     * approuve l'hôpital, démarre l'essai et provisionne l'admin (email) immédiatement.
     * @return true si l'onboarding automatique a eu lieu.
     */
    boolean onboardTrialIfEnabled(Long hospitalId);

    /** Vrai si l'automatisation complète est activée dans les réglages. */
    boolean isAutoApprove();

    /** Résumé de l'abonnement d'un hôpital (statut, jours restants, dates) pour la page Billing. */
    Map<String, Object> getHospitalSubscription(Long hospitalId);

    /** Vrai si l'accès clinique doit être bloqué (EXPIRED, hors délai de grâce). */
    boolean isClinicalAccessBlocked(Hospital hospital);

    /** Job périodique : transitions TRIAL/GRACE/EXPIRED + alertes J-5. */
    void runSubscriptionMaintenance();
}
