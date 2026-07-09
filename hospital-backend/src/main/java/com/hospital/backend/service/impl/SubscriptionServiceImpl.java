package com.hospital.backend.service.impl;

import com.hospital.backend.dto.PaymentRequestDTO;
import com.hospital.backend.dto.SubscriptionPaymentDTO;
import com.hospital.backend.dto.SubscriptionSettingsDTO;
import com.hospital.backend.entity.*;
import com.hospital.backend.exception.BadRequestException;
import com.hospital.backend.exception.ResourceNotFoundException;
import com.hospital.backend.repository.*;
import com.hospital.backend.service.AdminProvisioningService;
import com.hospital.backend.service.EmailService;
import com.hospital.backend.service.NotificationService;
import com.hospital.backend.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionServiceImpl implements SubscriptionService {

    private final SubscriptionSettingsRepository settingsRepository;
    private final SubscriptionPaymentRepository paymentRepository;
    private final HospitalRepository hospitalRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AdminProvisioningService adminProvisioningService;

    private static final Long SETTINGS_ID = 1L;

    // ════════════════════════════════════════════════
    // RÉGLAGES
    // ════════════════════════════════════════════════

    @Override
    @Transactional
    public SubscriptionSettings getSettingsEntity() {
        return settingsRepository.findById(SETTINGS_ID)
                .orElseGet(() -> settingsRepository.save(
                        SubscriptionSettings.builder().id(SETTINGS_ID).build()));
    }

    @Override
    @Transactional(readOnly = true)
    public SubscriptionSettingsDTO getSettings() {
        return toSettingsDTO(getSettingsEntity());
    }

    @Override
    @Transactional
    public SubscriptionSettingsDTO updateSettings(SubscriptionSettingsDTO dto) {
        SubscriptionSettings s = getSettingsEntity();
        if (dto.getCurrency() != null) s.setCurrency(dto.getCurrency().toUpperCase());
        if (dto.getStandardMonthlyPrice() != null) s.setStandardMonthlyPrice(dto.getStandardMonthlyPrice());
        if (dto.getPremiumMonthlyPrice() != null) s.setPremiumMonthlyPrice(dto.getPremiumMonthlyPrice());
        if (dto.getEnterpriseMonthlyPrice() != null) s.setEnterpriseMonthlyPrice(dto.getEnterpriseMonthlyPrice());
        if (dto.getAnnualDiscountPercent() != null) s.setAnnualDiscountPercent(dto.getAnnualDiscountPercent());
        if (dto.getTrialDays() != null) s.setTrialDays(Math.max(0, dto.getTrialDays()));
        if (dto.getGraceDays() != null) s.setGraceDays(Math.max(0, dto.getGraceDays()));
        if (dto.getAlertDaysBefore() != null) s.setAlertDaysBefore(Math.max(0, dto.getAlertDaysBefore()));
        if (dto.getAutoApprove() != null) s.setAutoApprove(dto.getAutoApprove());
        return toSettingsDTO(settingsRepository.save(s));
    }

    @Override
    @Transactional
    public Map<String, Object> getPublicPricing() {
        SubscriptionSettings s = getSettingsEntity();
        List<Map<String, Object>> plans = new ArrayList<>();
        for (String plan : List.of("STANDARD", "PREMIUM", "ENTERPRISE")) {
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("plan", plan);
            p.put("monthly", monthlyPrice(s, plan));
            p.put("annual", computeAnnual(s, plan));
            p.put("annualMonthlyEquivalent", computeAnnual(s, plan)
                    .divide(new BigDecimal("12"), 2, RoundingMode.HALF_UP));
            plans.add(p);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("currency", s.getCurrency());
        result.put("annualDiscountPercent", s.getAnnualDiscountPercent());
        result.put("trialDays", s.getTrialDays());
        result.put("plans", plans);
        return result;
    }

    @Override
    @Transactional
    public BigDecimal computePrice(String plan, String period) {
        SubscriptionSettings s = getSettingsEntity();
        return "ANNUAL".equalsIgnoreCase(period) ? computeAnnual(s, plan) : monthlyPrice(s, plan);
    }

    private BigDecimal monthlyPrice(SubscriptionSettings s, String plan) {
        return switch (plan == null ? "" : plan.toUpperCase()) {
            case "PREMIUM" -> nz(s.getPremiumMonthlyPrice());
            case "ENTERPRISE" -> nz(s.getEnterpriseMonthlyPrice());
            default -> nz(s.getStandardMonthlyPrice());
        };
    }

    private BigDecimal computeAnnual(SubscriptionSettings s, String plan) {
        BigDecimal yearly = monthlyPrice(s, plan).multiply(new BigDecimal("12"));
        BigDecimal discount = nz(s.getAnnualDiscountPercent());
        BigDecimal factor = BigDecimal.ONE.subtract(discount.divide(new BigDecimal("100"), 6, RoundingMode.HALF_UP));
        return yearly.multiply(factor).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    // ════════════════════════════════════════════════
    // PAIEMENTS (simulation)
    // ════════════════════════════════════════════════

    @Override
    @Transactional
    public SubscriptionPayment submitPayment(PaymentRequestDTO req) {
        if (req.getHospitalId() == null) throw new BadRequestException("Hôpital manquant");
        Hospital hospital = hospitalRepository.findById(req.getHospitalId())
                .orElseThrow(() -> new ResourceNotFoundException("Hôpital introuvable"));

        String plan = (req.getPlan() != null ? req.getPlan() : hospital.getSubscriptionPlan());
        if (plan == null) plan = "STANDARD";
        String period = "ANNUAL".equalsIgnoreCase(req.getPeriod()) ? "ANNUAL" : "MONTHLY";
        SubscriptionSettings s = getSettingsEntity();
        BigDecimal amount = computePrice(plan, period);

        LocalDate start = LocalDate.now();
        LocalDate end = "ANNUAL".equals(period) ? start.plusYears(1) : start.plusMonths(1);

        SubscriptionPayment payment = SubscriptionPayment.builder()
                .hospital(hospital)
                .plan(plan.toUpperCase())
                .period(period)
                .amount(amount)
                .currency(s.getCurrency())
                .method(req.getMethod() != null ? req.getMethod().toUpperCase() : "VISA")
                .status("PENDING")
                .reference(generateReference())
                .payerName(req.getPayerName())
                .payerDetail(req.getPayerDetail())
                .periodStart(start)
                .periodEnd(end)
                .build();

        SubscriptionPayment saved = paymentRepository.save(payment);

        // L'hôpital passe en attente de confirmation du paiement (si pas déjà actif via essai)
        if (hospital.getSubscriptionStatus() == null
                || "PENDING_PAYMENT".equals(hospital.getSubscriptionStatus())) {
            hospital.setSubscriptionStatus("PENDING_PAYMENT");
            hospitalRepository.save(hospital);
        }

        log.info("💳 [SUBSCRIPTION] Paiement simulé {} — hôpital {} — {} {} ({})",
                saved.getReference(), hospital.getNom(), amount, s.getCurrency(), saved.getMethod());

        // 🤖 AUTOMATISATION : en mode auto (défaut), le paiement est confirmé immédiatement
        // (comme une passerelle de paiement) → activation + provisioning + email, sans Super Admin.
        if (Boolean.TRUE.equals(s.getAutoApprove() == null ? Boolean.TRUE : s.getAutoApprove())) {
            return confirmPayment(saved.getId(), "AUTO");
        }

        // Mode manuel : le Super Admin devra confirmer depuis sa file d'attente
        notifySuperAdminsPayment(saved);
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubscriptionPaymentDTO> getPaymentsForHospital(Long hospitalId) {
        return paymentRepository.findByHospitalIdOrderByCreatedAtDesc(hospitalId).stream()
                .map(this::toPaymentDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubscriptionPaymentDTO> getPendingPayments() {
        return paymentRepository.findByStatusOrderByCreatedAtDesc("PENDING").stream()
                .map(this::toPaymentDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long countPendingPayments() {
        return paymentRepository.countByStatus("PENDING");
    }

    @Override
    @Transactional
    public SubscriptionPayment confirmPayment(Long paymentId, String confirmedBy) {
        SubscriptionPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement introuvable"));
        if (!"PENDING".equals(payment.getStatus())) {
            throw new BadRequestException("Ce paiement a déjà été traité (" + payment.getStatus() + ")");
        }

        payment.setStatus("CONFIRMED");
        payment.setConfirmedBy(confirmedBy);
        payment.setConfirmedAt(LocalDateTime.now());

        // Appliquer la période à l'abonnement de l'hôpital (prolongation si encore actif)
        Hospital h = payment.getHospital();
        LocalDate today = LocalDate.now();
        LocalDate base = (h.getSubscriptionEnd() != null && h.getSubscriptionEnd().isAfter(today))
                ? h.getSubscriptionEnd() : today;
        LocalDate newEnd = "ANNUAL".equals(payment.getPeriod()) ? base.plusYears(1) : base.plusMonths(1);

        if (h.getSubscriptionStart() == null) h.setSubscriptionStart(today);
        h.setSubscriptionEnd(newEnd);
        h.setSubscriptionPlan(payment.getPlan());
        h.setSubscriptionType(payment.getPeriod());
        h.setSubscriptionStatus("ACTIVE");
        h.setLastSubscriptionAlert(null);
        h.setIsActive(true);
        // Un paiement confirmé approuve définitivement l'établissement
        if (h.getRegistrationStatus() == null || "PENDING".equals(h.getRegistrationStatus())) {
            h.setRegistrationStatus("APPROVED");
        }
        hospitalRepository.save(h);

        payment.setPeriodStart(base);
        payment.setPeriodEnd(newEnd);
        SubscriptionPayment saved = paymentRepository.save(payment);

        // 👤 Provisionner l'admin + envoyer les identifiants si l'hôpital n'en a pas encore
        // (premier paiement). Pour un renouvellement, l'admin existe déjà → simple notification.
        boolean provisioned = false;
        try {
            String email = h.getAdminEmail();
            if (email != null && !email.isBlank()
                    && !adminProvisioningService.hasAdmin(h.getId())
                    && !userRepository.existsByEmail(email)) {
                adminProvisioningService.provisionAdmin(h, email,
                        h.getRequestedAdminFirstName(), h.getRequestedAdminLastName(), actorOrAuto(confirmedBy));
                provisioned = true;
            }
        } catch (Exception e) {
            log.error("[SUBSCRIPTION] Provisioning admin échoué pour {}: {}", h.getNom(), e.getMessage());
        }

        if (!provisioned) {
            notifyHospitalAdmins(h, "Paiement confirmé",
                    "Votre paiement de " + payment.getAmount() + " " + payment.getCurrency()
                            + " a été confirmé. Abonnement " + payment.getPlan()
                            + " actif jusqu'au " + newEnd + ".");
        }
        log.info("✅ [SUBSCRIPTION] Paiement {} confirmé ({}) — hôpital {} actif jusqu'au {} — admin provisionné: {}",
                payment.getReference(), confirmedBy, h.getNom(), newEnd, provisioned);
        return saved;
    }

    private String actorOrAuto(String actor) {
        return actor != null ? actor : "AUTO";
    }

    @Override
    @Transactional
    public SubscriptionPayment rejectPayment(Long paymentId, String reason) {
        SubscriptionPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement introuvable"));
        if (!"PENDING".equals(payment.getStatus())) {
            throw new BadRequestException("Ce paiement a déjà été traité (" + payment.getStatus() + ")");
        }
        payment.setStatus("REJECTED");
        payment.setRejectionReason(reason);
        payment.setConfirmedAt(LocalDateTime.now());
        SubscriptionPayment saved = paymentRepository.save(payment);

        notifyHospitalAdmins(payment.getHospital(), "Paiement rejeté",
                "Votre paiement " + payment.getReference() + " a été rejeté."
                        + (reason != null && !reason.isBlank() ? " Motif : " + reason : ""));
        return saved;
    }

    // ════════════════════════════════════════════════
    // CYCLE DE VIE
    // ════════════════════════════════════════════════

    @Override
    @Transactional
    public void startTrialOrPending(Hospital hospital) {
        SubscriptionSettings s = getSettingsEntity();
        LocalDate today = LocalDate.now();
        if (s.getTrialDays() != null && s.getTrialDays() > 0) {
            hospital.setSubscriptionStatus("TRIAL");
            hospital.setSubscriptionStart(today);
            hospital.setSubscriptionEnd(today.plusDays(s.getTrialDays()));
            hospital.setSubscriptionType("TRIAL");
            hospital.setIsActive(true);
            log.info("🎁 [SUBSCRIPTION] Essai gratuit de {} jours pour {}", s.getTrialDays(), hospital.getNom());
        } else {
            hospital.setSubscriptionStatus("PENDING_PAYMENT");
            hospital.setIsActive(false);
            log.info("💳 [SUBSCRIPTION] {} en attente de paiement (pas d'essai)", hospital.getNom());
        }
        hospital.setLastSubscriptionAlert(null);
        hospitalRepository.save(hospital);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAutoApprove() {
        Boolean v = getSettingsEntity().getAutoApprove();
        return v == null || v; // défaut = automatique
    }

    @Override
    @Transactional
    public boolean onboardTrialIfEnabled(Long hospitalId) {
        SubscriptionSettings s = getSettingsEntity();
        boolean auto = s.getAutoApprove() == null || s.getAutoApprove();
        boolean hasTrial = s.getTrialDays() != null && s.getTrialDays() > 0;
        if (!auto || !hasTrial) return false; // sans auto ou sans essai : on attend le paiement / le Super Admin

        Hospital h = hospitalRepository.findById(hospitalId).orElse(null);
        if (h == null) return false;

        // Approuver + démarrer l'essai
        h.setRegistrationStatus("APPROVED");
        startTrialOrPending(h); // pose TRIAL + dates + isActive (trialDays>0 garanti ici)

        // Provisionner l'admin immédiatement + email
        try {
            String email = h.getAdminEmail();
            if (email != null && !email.isBlank()
                    && !adminProvisioningService.hasAdmin(h.getId())
                    && !userRepository.existsByEmail(email)) {
                adminProvisioningService.provisionAdmin(h, email,
                        h.getRequestedAdminFirstName(), h.getRequestedAdminLastName(), "AUTO");
            }
        } catch (Exception e) {
            log.error("[SUBSCRIPTION] Onboarding essai — provisioning échoué pour {}: {}", h.getNom(), e.getMessage());
        }
        log.info("🎁 [SUBSCRIPTION] Onboarding automatique (essai) pour {}", h.getNom());
        return true;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getHospitalSubscription(Long hospitalId) {
        Hospital h = hospitalRepository.findById(hospitalId)
                .orElseThrow(() -> new ResourceNotFoundException("Hôpital introuvable"));
        SubscriptionSettings s = getSettingsEntity();
        LocalDate today = LocalDate.now();
        String status = h.getSubscriptionStatus() != null ? h.getSubscriptionStatus() : "ACTIVE";

        Integer daysRemaining = null;
        if (h.getSubscriptionEnd() != null) {
            daysRemaining = (int) ChronoUnit.DAYS.between(today, h.getSubscriptionEnd());
        }

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("hospitalId", h.getId());
        m.put("hospitalName", h.getNom());
        m.put("status", status);
        m.put("plan", h.getSubscriptionPlan());
        m.put("type", h.getSubscriptionType());
        m.put("startDate", h.getSubscriptionStart());
        m.put("endDate", h.getSubscriptionEnd());
        m.put("daysRemaining", daysRemaining);
        m.put("graceDays", s.getGraceDays());
        m.put("currency", s.getCurrency());
        m.put("blocked", isClinicalAccessBlocked(h));
        m.put("isActive", h.getIsActive());
        return m;
    }

    @Override
    public boolean isClinicalAccessBlocked(Hospital hospital) {
        if (hospital == null) return false;
        // Hôpitaux historiques sans abonnement défini : jamais bloqués par ce mécanisme.
        if (hospital.getSubscriptionEnd() == null) return false;
        // Bloqué uniquement si la date d'échéance + délai de grâce est dépassée.
        SubscriptionSettings s = getSettingsEntity();
        int grace = s.getGraceDays() != null ? s.getGraceDays() : 0;
        LocalDate hardStop = hospital.getSubscriptionEnd().plusDays(grace);
        return LocalDate.now().isAfter(hardStop);
    }

    @Override
    @Transactional
    public void runSubscriptionMaintenance() {
        SubscriptionSettings s = getSettingsEntity();
        int alertBefore = s.getAlertDaysBefore() != null ? s.getAlertDaysBefore() : 5;
        int grace = s.getGraceDays() != null ? s.getGraceDays() : 0;
        LocalDate today = LocalDate.now();

        List<Hospital> hospitals = hospitalRepository.findAll();
        for (Hospital h : hospitals) {
            if (h.getSubscriptionEnd() == null) continue;
            String regStatus = h.getRegistrationStatus();
            if (regStatus != null && "REJECTED".equals(regStatus)) continue;

            LocalDate end = h.getSubscriptionEnd();
            LocalDate hardStop = end.plusDays(grace);
            long daysToEnd = ChronoUnit.DAYS.between(today, end);

            try {
                if (today.isAfter(hardStop)) {
                    // Expiré, hors grâce → blocage clinique
                    if (!"EXPIRED".equals(h.getSubscriptionStatus())) {
                        h.setSubscriptionStatus("EXPIRED");
                        hospitalRepository.save(h);
                    }
                    if (!"EXPIRED".equals(h.getLastSubscriptionAlert())) {
                        notifyHospitalAdmins(h, "Abonnement expiré",
                                "L'abonnement de « " + h.getNom() + " » est expiré. Les modules cliniques "
                                        + "(réception, pharmacie, laboratoire, médecins, finance) sont désormais bloqués. "
                                        + "Renouvelez depuis la page Facturation pour les réactiver.");
                        h.setLastSubscriptionAlert("EXPIRED");
                        hospitalRepository.save(h);
                    }
                } else if (today.isAfter(end)) {
                    // Dans le délai de grâce
                    if (!"GRACE".equals(h.getSubscriptionStatus())) {
                        h.setSubscriptionStatus("GRACE");
                        hospitalRepository.save(h);
                    }
                    if (!"GRACE".equals(h.getLastSubscriptionAlert())) {
                        notifyHospitalAdmins(h, "Abonnement échu — délai de grâce",
                                "L'abonnement de « " + h.getNom() + " » a expiré le " + end + ". "
                                        + "Vous disposez d'un délai de grâce de " + grace + " jour(s) avant blocage. "
                                        + "Merci de renouveler rapidement.");
                        h.setLastSubscriptionAlert("GRACE");
                        hospitalRepository.save(h);
                    }
                } else if (daysToEnd <= alertBefore) {
                    // Alerte J-N avant échéance
                    if (!"ALERT".equals(h.getLastSubscriptionAlert())) {
                        notifyHospitalAdmins(h, "Abonnement bientôt expiré",
                                "L'abonnement de « " + h.getNom() + " » expire le " + end + " (dans "
                                        + daysToEnd + " jour(s)). Pensez à le renouveler pour éviter toute interruption.");
                        h.setLastSubscriptionAlert("ALERT");
                        hospitalRepository.save(h);
                    }
                }
            } catch (Exception e) {
                log.warn("[SUBSCRIPTION] Maintenance échouée pour hôpital {}: {}", h.getId(), e.getMessage());
            }
        }
    }

    // ════════════════════════════════════════════════
    // NOTIFICATIONS
    // ════════════════════════════════════════════════

    private void notifySuperAdminsPayment(SubscriptionPayment p) {
        try {
            List<User> superAdmins = new ArrayList<>();
            for (String roleName : List.of("ROLE_SUPERADMIN", "SUPERADMIN")) {
                roleRepository.findByNom(roleName)
                        .ifPresent(role -> superAdmins.addAll(userRepository.findByRole(role)));
            }
            String title = "Nouveau paiement à confirmer";
            String msg = "« " + p.getHospital().getNom() + " » a payé " + p.getAmount() + " " + p.getCurrency()
                    + " (" + p.getPlan() + " / " + p.getPeriod() + ") via " + p.getMethod()
                    + ". Réf: " + p.getReference();
            for (User sa : superAdmins) {
                notificationService.createAndSend(sa, title, msg, NotificationType.PAIEMENT_RECU, p.getId());
            }
        } catch (Exception e) {
            log.warn("[SUBSCRIPTION] Notif superadmins échouée: {}", e.getMessage());
        }
    }

    private void notifyHospitalAdmins(Hospital hospital, String title, String message) {
        try {
            List<User> admins = userRepository.findByHospitalId(hospital.getId()).stream()
                    .filter(u -> u.getRole() != null
                            && u.getRole().getNom() != null
                            && u.getRole().getNom().toUpperCase().contains("ADMIN"))
                    .collect(Collectors.toList());
            for (User admin : admins) {
                notificationService.createAndSend(admin, title, message, NotificationType.SYSTEME, hospital.getId());
                if (admin.getEmail() != null && admin.getEmail().contains("@")) {
                    try {
                        emailService.sendHtmlEmail(admin.getEmail(), "[Inua Afya] " + title,
                                "<p>" + message + "</p>");
                    } catch (Exception ignore) { /* email best-effort */ }
                }
            }
        } catch (Exception e) {
            log.warn("[SUBSCRIPTION] Notif admins échouée: {}", e.getMessage());
        }
    }

    // ════════════════════════════════════════════════
    // MAPPERS / UTILS
    // ════════════════════════════════════════════════

    private String generateReference() {
        String ref;
        do {
            ref = "PAY-" + Long.toString(System.currentTimeMillis(), 36).toUpperCase()
                    + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        } while (paymentRepository.existsByReference(ref));
        return ref;
    }

    private SubscriptionSettingsDTO toSettingsDTO(SubscriptionSettings s) {
        return SubscriptionSettingsDTO.builder()
                .currency(s.getCurrency())
                .standardMonthlyPrice(s.getStandardMonthlyPrice())
                .premiumMonthlyPrice(s.getPremiumMonthlyPrice())
                .enterpriseMonthlyPrice(s.getEnterpriseMonthlyPrice())
                .annualDiscountPercent(s.getAnnualDiscountPercent())
                .trialDays(s.getTrialDays())
                .graceDays(s.getGraceDays())
                .alertDaysBefore(s.getAlertDaysBefore())
                .autoApprove(s.getAutoApprove() == null || s.getAutoApprove())
                .build();
    }

    private SubscriptionPaymentDTO toPaymentDTO(SubscriptionPayment p) {
        return SubscriptionPaymentDTO.builder()
                .id(p.getId())
                .hospitalId(p.getHospital() != null ? p.getHospital().getId() : null)
                .hospitalName(p.getHospital() != null ? p.getHospital().getNom() : null)
                .plan(p.getPlan())
                .period(p.getPeriod())
                .amount(p.getAmount())
                .currency(p.getCurrency())
                .method(p.getMethod())
                .status(p.getStatus())
                .reference(p.getReference())
                .payerName(p.getPayerName())
                .payerDetail(p.getPayerDetail())
                .periodStart(p.getPeriodStart())
                .periodEnd(p.getPeriodEnd())
                .confirmedBy(p.getConfirmedBy())
                .confirmedAt(p.getConfirmedAt())
                .rejectionReason(p.getRejectionReason())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
