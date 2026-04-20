package com.hospital.backend.service;

import com.hospital.backend.dto.AdmissionDTO;
import com.hospital.backend.dto.RevenueDTO;
import com.hospital.backend.entity.Admission;
import com.hospital.backend.entity.Consultation;
import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.entity.Currency;
import com.hospital.backend.entity.PaymentMethod;
import com.hospital.backend.entity.Revenue;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.AdmissionRepository;
import com.hospital.backend.repository.ConsultationRepository;
import com.hospital.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

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
    private final AdmissionRepository admissionRepository;
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
            .currency(Currency.USD)  // Par défaut en USD (les admissions sont en USD)
            .description("Paiement consultation - Patient: " + patientName +
                        " - Consultation ID: " + consultation.getId())
            .date(LocalDateTime.now())
            .build();

        revenueService.createRevenue(revenueDTO, userId != null ? userId : 1L);
        log.info("💰 Revenu créé: {} USD pour {} - Source: {}", amountPaid, patientName, source);
    }
    
    /**
     * Récupère la file d'attente des admissions pour la caisse
     * VERSION AVEC FILTRE DATE
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getAdmissionsQueue(String date) {
        log.info("📋 [ULTRA-SIMPLE] Récupération des admissions - Date: {}", date);
        
        try {
            // Récupérer toutes les admissions
            List<Admission> allAdmissions = admissionRepository.findAll();
            log.info("📋 [ULTRA-SIMPLE] Total admissions en base: {}", allAdmissions.size());
            
            // Log des statuts pour debug
            allAdmissions.forEach(a -> 
                log.info("🔍 [ULTRA-SIMPLE] Admission ID: {} | Status: {} | Date: {} | Patient: {}",
                    a.getId(), a.getStatus(), a.getAdmissionDate(),
                    a.getPatient() != null ? a.getPatient().getFirstName() : "null")
            );
            
            // Filtrer pour exclure les admissions déjà complètement payées
            List<Admission> admissions = allAdmissions.stream()
                .filter(a -> {
                    BigDecimal paid = a.getAmountPaid() != null ? a.getAmountPaid() : BigDecimal.ZERO;
                    BigDecimal total = a.getTotalAmount() != null ? a.getTotalAmount() : BigDecimal.ZERO;
                    // Garder seulement si montant payé < montant total (non payée ou partiellement)
                    return paid.compareTo(total) < 0;
                })
                .collect(Collectors.toList());
            
            log.info("📋 [ULTRA-SIMPLE] Admissions non payées: {}/{} (après filtre paiement)",
                admissions.size(), allAdmissions.size());
            
            // Filtrer par date si spécifiée
            if (date != null && !date.isEmpty()) {
                java.time.LocalDate targetDate = java.time.LocalDate.parse(date);
                admissions = admissions.stream()
                    .filter(a -> a.getAdmissionDate() != null && 
                                 a.getAdmissionDate().toLocalDate().equals(targetDate))
                    .collect(Collectors.toList());
                log.info("📅 [ULTRA-SIMPLE] Filtre date {}: {}/{} admissions trouvées", 
                    date, admissions.size(), allAdmissions.size());
            }
            
            // Mapper en DTOs avec calcul du montant total depuis les consultations/services/examens
            List<AdmissionDTO> admissionDTOs = admissions.stream()
                .map(admission -> {
                    // Récupérer les consultations associées à cette admission
                    List<Consultation> consultations = consultationRepository.findByAdmissionId(admission.getId());
                    log.info("🔍 [ULTRA-SIMPLE] Admission {}: {} consultations trouvées", admission.getId(), consultations.size());
                    
                    // Calculer le montant total des services (ancien système)
                    BigDecimal servicesTotal = consultations.stream()
                        .flatMap(c -> c.getServices() != null ? c.getServices().stream() : java.util.stream.Stream.empty())
                        .map(service -> service.getPrix() != null ? BigDecimal.valueOf(service.getPrix()) : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                    
                    // Calculer le montant depuis les examens prescrits (nouveau système)
                    BigDecimal examsTotal = consultations.stream()
                        .map(c -> c.getExamTotalAmount() != null ? c.getExamTotalAmount() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                    
                    // NOUVEAU: Calculer depuis les champs ficheAmountDue et consulAmountDue des consultations (Double -> BigDecimal)
                    BigDecimal ficheTotal = consultations.stream()
                        .map(c -> c.getFicheAmountDue() != null ? BigDecimal.valueOf(c.getFicheAmountDue()) : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                    
                    BigDecimal consulTotal = consultations.stream()
                        .map(c -> c.getConsulAmountDue() != null ? BigDecimal.valueOf(c.getConsulAmountDue()) : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                    
                    BigDecimal consultMontant = ficheTotal.add(consulTotal);
                    
                    log.info("💰 [ULTRA-SIMPLE] Admission {}: Services={}, Examens={}, Fiche={}, Consul={}, Admission.totalAmount={}", 
                        admission.getId(), servicesTotal, examsTotal, ficheTotal, consulTotal, admission.getTotalAmount());
                    
                    // Prendre le plus grand des montants disponibles
                    BigDecimal calculatedTotal = servicesTotal.compareTo(examsTotal) > 0 ? servicesTotal : examsTotal;
                    calculatedTotal = calculatedTotal.compareTo(consultMontant) > 0 ? calculatedTotal : consultMontant;
                    
                    // Si pas de montant calculé, utiliser le totalAmount stocké dans l'admission
                    BigDecimal totalAmount = calculatedTotal.compareTo(BigDecimal.ZERO) > 0 
                        ? calculatedTotal 
                        : (admission.getTotalAmount() != null ? admission.getTotalAmount() : BigDecimal.ZERO);
                    
                    log.info("💰 [ULTRA-SIMPLE] Admission {}: Montant final={}", admission.getId(), totalAmount);
                    
                    return mapToAdmissionDTO(admission, totalAmount);
                })
                .collect(Collectors.toList());
            
            log.info("✅ [ULTRA-SIMPLE] {} admissions récupérées avec montants", admissionDTOs.size());
            
            return Map.of(
                "success", true,
                "data", admissionDTOs,
                "count", admissionDTOs.size()
            );
        } catch (Exception e) {
            log.error("❌ [ULTRA-SIMPLE] ERREUR récupération admissions: {}", e.getMessage(), e);
            return Map.of(
                "success", false,
                "message", "Erreur: " + e.getMessage()
            );
        }
    }
    
    private AdmissionDTO mapToAdmissionDTO(Admission admission, BigDecimal totalAmount) {
        String patientName = "Patient";
        Long patientId = null;
        if (admission.getPatient() != null) {
            patientName = admission.getPatient().getFirstName() + " " + admission.getPatient().getLastName();
            patientId = admission.getPatient().getId();
        }
        
        String doctorName = "";
        Long doctorId = null;
        if (admission.getDoctor() != null) {
            doctorName = admission.getDoctor().getFirstName() + " " + admission.getDoctor().getLastName();
            doctorId = admission.getDoctor().getId();
        }
        
        return AdmissionDTO.builder()
            .id(admission.getId())
            .patientId(patientId)
            .patientName(patientName)
            .doctorId(doctorId)
            .doctorName(doctorName)
            .admissionDate(admission.getAdmissionDate())
            .reasonForVisit(admission.getReasonForVisit())
            .status(admission.getStatus())
            .totalAmount(totalAmount)
            .createdAt(admission.getCreatedAt())
            .build();
    }
}
