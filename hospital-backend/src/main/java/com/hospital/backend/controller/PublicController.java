package com.hospital.backend.controller;

import com.hospital.backend.dto.ApiResponse;
import com.hospital.backend.dto.HospitalDTO;
import com.hospital.backend.entity.Hospital;
import com.hospital.backend.repository.HospitalRepository;
import com.hospital.backend.service.HospitalService;
import com.hospital.backend.service.SystemConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 🌐 PublicController — Endpoints accessibles sans authentification
 * Permet au frontend de vérifier le statut système (maintenance, santé)
 * avant même que l'utilisateur ne se connecte.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Public", description = "Endpoints publics — aucune authentification requise")
public class PublicController {

    private final SystemConfigService systemConfigService;
    private final HospitalRepository hospitalRepository;
    private final HospitalService hospitalService;
    private final com.hospital.backend.service.SubscriptionService subscriptionService;

    /**
     * Retourne le statut maintenance + un message.
     * Appelé par le frontend toutes les 30s pour afficher une bannière.
     */
    @GetMapping("/system-status")
    @Operation(summary = "Statut public du système (maintenance)")
    public ResponseEntity<?> getSystemStatus() {
        boolean maintenance = systemConfigService.isMaintenanceMode();
        String message = maintenance
                ? "Inua Afya est momentanément en maintenance. Notre équipe travaille activement à résoudre cela. Merci de votre patience, nous serons de retour très bientôt."
                : "Système opérationnel.";

        Map<String, Object> data = new HashMap<>();
        data.put("maintenance", maintenance);
        data.put("message", message);
        data.put("timestamp", LocalDateTime.now().toString());

        return ResponseEntity.ok(ApiResponse.success("Statut système", data));
    }

    /**
     * Liste les hôpitaux actifs pour l'inscription des patients.
     * Aucune authentification requise.
     */
    @GetMapping("/hospitals")
    @Operation(summary = "Liste publique des hôpitaux actifs")
    public ResponseEntity<?> getPublicHospitals() {
        try {
            List<Hospital> hospitals = hospitalRepository.findAllByIsActiveTrue();
            List<Map<String, Object>> result = hospitals.stream().map(h -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", h.getId());
                m.put("nom", h.getNom());
                m.put("code", h.getCode());
                m.put("city", h.getCity());
                m.put("country", h.getCountry());
                return m;
            }).toList();
            return ResponseEntity.ok(ApiResponse.success("Hopitaux actifs", result));
        } catch (Exception e) {
            log.error("[Public] Erreur liste hopitaux: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur"));
        }
    }

    /**
     * 🏥 Demande publique d'inscription d'un nouvel hôpital.
     * Crée l'établissement en statut PENDING (inactif) et notifie les superadmins.
     * Aucune authentification requise (formulaire de la landing page).
     */
    @PostMapping("/hospital-registration")
    @Operation(summary = "Demande publique d'inscription d'un hôpital")
    public ResponseEntity<?> registerHospital(@RequestBody HospitalDTO dto) {
        try {
            HospitalDTO created = hospitalService.registerPublic(dto);

            // 🤖 Automatisation : si essai gratuit + auto-approbation, on active et provisionne
            // l'admin immédiatement (identifiants envoyés par email), sans Super Admin.
            boolean onboarded = false;
            try {
                onboarded = subscriptionService.onboardTrialIfEnabled(created.getId());
            } catch (Exception ex) {
                log.warn("[Public] Onboarding auto ignoré: {}", ex.getMessage());
            }

            String message = onboarded
                    ? "Votre établissement est créé ! Vos identifiants d'administrateur ont été envoyés par email."
                    : "Votre demande a bien été enregistrée. Finalisez le paiement pour activer votre établissement.";
            return ResponseEntity.status(201).body(ApiResponse.success(message,
                    Map.of("id", created.getId(), "code", created.getCode(),
                            "status", created.getRegistrationStatus(), "autoOnboarded", onboarded)));
        } catch (IllegalArgumentException | com.hospital.backend.exception.BadRequestException e) {
            log.warn("[Public] Demande d'inscription invalide: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[Public] Erreur inscription hopital: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur lors de l'enregistrement de la demande"));
        }
    }

    /**
     * 💳 Tarifs publics des abonnements (par plan, mensuel/annuel) + devise + jours d'essai.
     * Alimente le formulaire de choix de plan sur la landing.
     */
    @GetMapping("/subscription-pricing")
    @Operation(summary = "Tarifs publics des abonnements")
    public ResponseEntity<?> getSubscriptionPricing() {
        try {
            return ResponseEntity.ok(ApiResponse.success("Tarifs", subscriptionService.getPublicPricing()));
        } catch (Exception e) {
            log.error("[Public] Erreur tarifs: {}", e.getMessage());
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur"));
        }
    }

    /**
     * 💳 Paiement (simulation) d'un abonnement pour un hôpital fraîchement inscrit.
     * Crée un paiement PENDING et notifie les superadmins. Aucune donnée bancaire réelle traitée.
     */
    @PostMapping("/subscription-payment")
    @Operation(summary = "Soumettre un paiement d'abonnement (simulation)")
    public ResponseEntity<?> submitSubscriptionPayment(@RequestBody com.hospital.backend.dto.PaymentRequestDTO req) {
        try {
            var payment = subscriptionService.submitPayment(req);
            return ResponseEntity.status(201).body(ApiResponse.success(
                    "Paiement enregistré. En attente de confirmation par notre équipe.",
                    Map.of("reference", payment.getReference(), "amount", payment.getAmount(),
                            "currency", payment.getCurrency(), "status", payment.getStatus())));
        } catch (IllegalArgumentException | com.hospital.backend.exception.BadRequestException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[Public] Erreur paiement: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(ApiResponse.error("Erreur lors du paiement"));
        }
    }
}
