package com.hospital.backend.service;

import com.hospital.backend.dto.AdmissionDTO;
import com.hospital.backend.dto.RevenueDTO;
import com.hospital.backend.entity.Admission;
import com.hospital.backend.entity.Company;
import com.hospital.backend.entity.Consultation;
import com.hospital.backend.entity.ConsultationStatus;
import com.hospital.backend.entity.Currency;
import com.hospital.backend.entity.Medication;
import com.hospital.backend.entity.PaymentMethod;
import com.hospital.backend.entity.Patient;
import com.hospital.backend.entity.Prescription;
import com.hospital.backend.entity.PrescriptionStatus;
import com.hospital.backend.entity.Revenue;
import com.hospital.backend.entity.SubscriptionStatus;
import com.hospital.backend.entity.User;
import com.hospital.backend.repository.AdmissionRepository;
import com.hospital.backend.repository.ConsultationRepository;
import com.hospital.backend.repository.MedicationRepository;
import com.hospital.backend.repository.PrescriptionRepository;
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
    private final PrescriptionRepository prescriptionRepository;
    private final CompanyConsumptionService companyConsumptionService;
    private final MedicationRepository medicationRepository;

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

            // ✅ METTRE À JOUR LES MONTANTS PAYÉS (important pour hasActiveFile)
            try {
                Double ficheDue = c.getFicheAmountDue();
                Double consulDue = c.getConsulAmountDue();

                if (ficheDue != null && ficheDue > 0) {
                    c.setFicheAmountPaid(ficheDue);
                    log.info("✅ [ULTRA-SIMPLE] ficheAmountPaid mis à jour: {}", ficheDue);
                }
                if (consulDue != null && consulDue > 0) {
                    c.setConsulAmountPaid(consulDue);
                    log.info("✅ [ULTRA-SIMPLE] consulAmountPaid mis à jour: {}", consulDue);
                }
            } catch (Exception e) {
                log.warn("⚠️ [ULTRA-SIMPLE] Erreur mise à jour montants payés: {}", e.getMessage());
                // Ne pas bloquer le paiement
            }

            // 4. METTRE À JOUR L'ADMISSION (montant payé)
            try {
                Admission admission = c.getAdmission();
                if (admission != null && admission.getId() != null) {
                    BigDecimal paid = BigDecimal.valueOf(amountPaid != null ? amountPaid : 0);
                    admission.setAmountPaid(paid);
                    admission.setPaymentMethod(paymentMethod != null ? paymentMethod : "ESPECES");
                    admissionRepository.save(admission);
                    log.info("✅ [ULTRA-SIMPLE] Admission mise à jour - ID: {}, Montant payé: {}", 
                        admission.getId(), paid);
                }
            } catch (Exception e) {
                log.warn("⚠️ [ULTRA-SIMPLE] Impossible de mettre à jour l'admission: {}", e.getMessage());
                // Ne pas bloquer le paiement
            }
            
            // 5. SAUVEGARDER
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
    public Map<String, Object> sendToDoctor(Long admissionId, Long doctorId) {
        log.info("==========================================");
        log.info("📤 [ULTRA-SIMPLE] Envoi au docteur - Admission: {}, Doctor: {}", admissionId, doctorId);
        log.info("==========================================");
        
        try {
            // 1. Récupérer l'admission
            if (admissionId == null) {
                return Map.of("success", false, "message", "ID admission requis");
            }
            
            Optional<Admission> admissionOpt = admissionRepository.findById(admissionId);
            if (admissionOpt.isEmpty()) {
                return Map.of("success", false, "message", "Admission non trouvée");
            }
            
            Admission admission = admissionOpt.get();
            
            // 2. Mettre à jour le statut de l'admission
            admission.setStatus(Admission.AdmissionStatus.EN_COURS);
            admissionRepository.save(admission);
            log.info("✅ [ULTRA-SIMPLE] Statut admission changé -> EN_COURS");
            
            // 3. Récupérer et mettre à jour la consultation associée
            List<Consultation> consultations = consultationRepository.findByAdmissionId(admissionId);
            if (!consultations.isEmpty()) {
                Consultation consultation = consultations.get(0);
                
                // Mettre à jour le docteur si fourni
                if (doctorId != null) {
                    Optional<User> doctorOpt = userRepository.findById(doctorId);
                    if (doctorOpt.isPresent()) {
                        consultation.setDoctor(doctorOpt.get());
                        log.info("✅ [ULTRA-SIMPLE] Docteur assigné: {}", doctorOpt.get().getId());
                    }
                }
                
                // Changer le statut de la consultation
                consultation.setStatus(ConsultationStatus.EN_COURS);
                consultation.setStatut("EN_COURS");
                consultationRepository.save(consultation);
                log.info("✅ [ULTRA-SIMPLE] Consultation mise à jour -> EN_COURS");
            }
            
            return Map.of(
                "success", true,
                "message", "Patient envoyé au docteur avec succès",
                "admissionId", admissionId,
                "status", "EN_COURS"
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
            // ── Optimisation : utiliser une requête filtrée au lieu de findAll() ─────────
            List<Admission> admissions;
            if (date != null && !date.isEmpty()) {
                java.time.LocalDate targetDate = java.time.LocalDate.parse(date);
                LocalDateTime startOfDay = targetDate.atStartOfDay();
                LocalDateTime endOfDay = targetDate.atTime(23, 59, 59);
                admissions = admissionRepository.findByAdmissionDateBetween(startOfDay, endOfDay);
                log.info("📅 [ULTRA-SIMPLE] Filtre date {}: {} admissions trouvées", date, admissions.size());
            } else {
                // Sans date : limiter aux 30 derniers jours pour éviter OOM
                LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
                admissions = admissionRepository.findByAdmissionDateAfter(thirtyDaysAgo);
                log.info("📋 [ULTRA-SIMPLE] 30 derniers jours : {} admissions trouvées", admissions.size());
            }

            // Filtrer pour exclure les admissions déjà complètement payées ET les annulées
            List<Admission> filteredAdmissions = admissions.stream()
                .filter(a -> {
                    // ✅ Exclure les admissions annulées
                    if (a.getStatus() == Admission.AdmissionStatus.ANNULE) {
                        return false;
                    }
                    // ✅ Inclure les abonnés même si totalAmount=0 (pour tracking)
                    if (Boolean.TRUE.equals(a.getIsAbonne())) {
                        return true;
                    }
                    BigDecimal paid = a.getAmountPaid() != null ? a.getAmountPaid() : BigDecimal.ZERO;
                    BigDecimal total = a.getTotalAmount() != null ? a.getTotalAmount() : BigDecimal.ZERO;
                    // Garder seulement si montant payé < montant total (non payée ou partiellement)
                    return paid.compareTo(total) < 0;
                })
                .collect(Collectors.toList());

            log.info("📋 [ULTRA-SIMPLE] Admissions non payées: {}/{} (après filtre paiement)",
                filteredAdmissions.size(), admissions.size());

            // Mapper en DTOs en utilisant les montants stockés dans l'admission (registrationFee, serviceFee, totalAmount)
            List<AdmissionDTO> admissionDTOs = filteredAdmissions.stream()
                .map(admission -> {
                    // Utiliser directement les montants stockés dans l'admission
                    BigDecimal registrationFee = admission.getRegistrationFee() != null
                        ? admission.getRegistrationFee()
                        : BigDecimal.ZERO;
                    BigDecimal serviceFee = admission.getServiceFee() != null
                        ? admission.getServiceFee()
                        : BigDecimal.ZERO;
                    BigDecimal totalAmount = admission.getTotalAmount() != null
                        ? admission.getTotalAmount()
                        : BigDecimal.ZERO;

                    log.info("💰 [ULTRA-SIMPLE] Admission {}: Registration={}, Service={}, Total={}",
                        admission.getId(), registrationFee, serviceFee, totalAmount);

                    return mapToAdmissionDTO(admission, totalAmount, registrationFee, serviceFee);
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
    
    private AdmissionDTO mapToAdmissionDTO(Admission admission, BigDecimal totalAmount, BigDecimal registrationFee, BigDecimal serviceFee) {
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

        // Champs abonnés
        String companyName = null;
        if (admission.getCompany() != null) {
            companyName = admission.getCompany().getName();
        }

        log.info("🔍 [DEBUG] Admission {} - isAbonne={}, companyName={}, patientSurplus={}, totalAmount={}",
            admission.getId(), admission.getIsAbonne(), companyName, admission.getPatientSurplus(), totalAmount);

        return AdmissionDTO.builder()
            .id(admission.getId())
            .patientId(patientId)
            .patientName(patientName)
            .doctorId(doctorId)
            .doctorName(doctorName)
            .admissionDate(admission.getAdmissionDate())
            .reasonForVisit(admission.getReasonForVisit())
            .status(admission.getStatus())
            .registrationFee(registrationFee)
            .serviceFee(serviceFee)
            .totalAmount(totalAmount)
            .createdAt(admission.getCreatedAt())
            // Champs abonnés
            .isAbonne(admission.getIsAbonne())
            .companyId(admission.getCompany() != null ? admission.getCompany().getId() : null)
            .companyName(companyName)
            .matricule(admission.getMatricule())
            .coverageRate(admission.getCoverageRate())
            .companyCoverage(admission.getCompanyCoverage())
            .patientSurplus(admission.getPatientSurplus())
            .build();
    }

    @Transactional(readOnly = false)
    public Map<String, Object> payPrescription(Long prescriptionId, String paymentMethod, Double amountPaid, Long userId) {
        log.info("==========================================");
        log.info("💊 [NOUVEAU FLUX] Paiement prescription pharmacie");
        log.info("💊 [NOUVEAU FLUX] ID: {}, Méthode: {}, Montant: {}", prescriptionId, paymentMethod, amountPaid);
        log.info("==========================================");
        
        if (prescriptionId == null) {
            log.error("❌ [NOUVEAU FLUX] prescriptionId est NULL!");
            return Map.of("success", false, "message", "ID prescription requis");
        }
        
        try {
            // 1. Vérifier que la prescription existe
            log.info("🔍 [NOUVEAU FLUX] Recherche prescription {}...", prescriptionId);
            Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new RuntimeException("Prescription non trouvée"));
            
            log.info("✅ [NOUVEAU FLUX] Prescription trouvée - ID: {}, Statut: {}", prescription.getId(), prescription.getStatus());
            
            // 2. Vérifier le statut actuel - doit être VALIDEE dans le nouveau flux
            if (prescription.getStatus() == PrescriptionStatus.PAYEE) {
                log.warn("⚠️ [NOUVEAU FLUX] Prescription déjà payée!");
                return Map.of("success", false, "message", "Prescription déjà payée");
            }

            if (prescription.getStatus() != PrescriptionStatus.VALIDEE) {
                log.warn("⚠️ [NOUVEAU FLUX] Prescription n'est pas validée par la pharmacie! Statut: {}", prescription.getStatus());
                return Map.of("success", false, "message", "La prescription doit être validée par la pharmacie avant le paiement");
            }
            
            // 3. Calculer le montant total de la prescription
            BigDecimal totalAmount = calculatePrescriptionTotal(prescription);
            log.info("💰 [NOUVEAU FLUX] Montant total calculé: {}", totalAmount);
            
            // 4. Vérifier si le patient est abonné et enregistrer la consommation
            Patient patient = prescription.getPatient();
            Admission admission = null;
            com.hospital.backend.entity.Company company = null;
            BigDecimal coverageRate = null;
            boolean isAbonne = false;
            BigDecimal finalAmountPaid = BigDecimal.valueOf(amountPaid != null ? amountPaid : totalAmount.doubleValue());
            
            // Récupérer l'admission via la consultation (relation Prescription -> Consultation -> Admission)
            if (prescription.getConsultation() != null && prescription.getConsultation().getAdmission() != null) {
                admission = prescription.getConsultation().getAdmission();
                
                // Vérifier si le patient est abonné (cohérent avec logique consultation/labo)
                if (Boolean.TRUE.equals(admission.getIsAbonne()) && admission.getCompany() != null) {
                    company = admission.getCompany();
                    if (company.getSubscriptionStatus() == com.hospital.backend.entity.SubscriptionStatus.ACTIVE) {
                        isAbonne = true;
                        coverageRate = admission.getCoverageRate() != null 
                            ? admission.getCoverageRate() : company.getCoverageRate();
                        if (coverageRate == null) coverageRate = new BigDecimal("100.00");
                        
                        log.info("💳 [NOUVEAU FLUX] Patient abonné détecté - Entreprise: {}, Taux couverture: {}%", 
                            company.getName(), coverageRate);
                        
                        // Calculer le ticket modeste si couverture < 100%
                        if (coverageRate.compareTo(new BigDecimal("100")) < 0) {
                            BigDecimal companyCoverage = totalAmount.multiply(coverageRate)
                                .divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
                            BigDecimal patientSurplus = totalAmount.subtract(companyCoverage);
                            finalAmountPaid = patientSurplus;
                            log.info("💳 [NOUVEAU FLUX] Ticket modeste - Couverture entreprise: {}, Surplus patient: {}", 
                                companyCoverage, patientSurplus);
                        } else {
                            // Couverture 100% - patient ne paie rien
                            finalAmountPaid = BigDecimal.ZERO;
                            log.info("💳 [NOUVEAU FLUX] Couverture 100% - Patient ne paie rien");
                        }
                    }
                }
            }
            
            // 5. Changer le statut à PAYEE
            log.info("📝 [NOUVEAU FLUX] Changement statut -> PAYEE...");
            prescription.setStatus(PrescriptionStatus.PAYEE);
            prescription.setTotalAmount(totalAmount);
            prescription.setAmountPaid(finalAmountPaid);
            prescription.setPaidAt(LocalDateTime.now());
            
            if (userId != null) {
                User paidBy = userRepository.findById(userId).orElse(null);
                prescription.setPaidBy(paidBy);
            }
            
            // 6. Sauvegarder
            log.info("💾 [NOUVEAU FLUX] Sauvegarde en cours...");
            Prescription saved = prescriptionRepository.save(prescription);
            log.info("✅ [NOUVEAU FLUX] Prescription sauvegardée - ID: {}, Nouveau statut: {}", saved.getId(), saved.getStatus());
            
            // 7. Déduire le stock des médicaments
            try {
                deductMedicationStock(saved);
                log.info("📦 [NOUVEAU FLUX] Stock déduit avec succès");
            } catch (Exception e) {
                log.error("❌ [NOUVEAU FLUX] Erreur déduction stock: {}", e.getMessage());
                // Ne pas bloquer le paiement si la déduction de stock échoue
            }
            
            // 8. Enregistrer la consommation pour les patients abonnés
            if (isAbonne && company != null && admission != null) {
                try {
                    companyConsumptionService.record(
                        company,
                        patient,
                        admission,
                        com.hospital.backend.entity.CompanyConsumptionRecord.FluxType.PHARMACIE,
                        "Prescription médicale - " + saved.getPrescriptionCode(),
                        totalAmount,
                        coverageRate
                    );
                    log.info("✅ [NOUVEAU FLUX] Consommation PHARMACIE enregistrée pour patient abonné");
                } catch (Exception e) {
                    log.error("❌ [NOUVEAU FLUX] Erreur enregistrement consommation: {}", e.getMessage());
                    // Ne pas bloquer le paiement si l'enregistrement de consommation échoue
                }
            }
            
            // 9. Créer le revenu automatiquement (seulement si le patient paie quelque chose)
            if (finalAmountPaid.compareTo(BigDecimal.ZERO) > 0) {
                try {
                    createRevenueFromPrescription(saved, finalAmountPaid.doubleValue(), paymentMethod, userId);
                    log.info("💰 [NOUVEAU FLUX] Revenu créé pour le paiement prescription");
                } catch (Exception e) {
                    log.error("❌ [NOUVEAU FLUX] Erreur création revenu: {}", e.getMessage());
                    // Ne pas bloquer le paiement si la création de revenu échoue
                }
            } else {
                log.info("💰 [NOUVEAU FLUX] Aucun revenu créé (patient abonné avec couverture 100%)");
            }
            
            log.info("==========================================");
            log.info("✅ [NOUVEAU FLUX] Paiement prescription réussi - Ticket généré");
            log.info("==========================================");
            
            return Map.of(
                "success", true,
                "message", isAbonne ? "Prescription payée avec succès (patient abonné)" : "Prescription payée avec succès - Stock déduit",
                "prescriptionId", saved.getId(),
                "status", saved.getStatus().name(),
                "totalAmount", saved.getTotalAmount(),
                "amountPaid", saved.getAmountPaid(),
                "isAbonne", isAbonne
            );
            
        } catch (Exception e) {
            log.error("❌ [NOUVEAU FLUX] ERREUR paiement prescription: {}", e.getMessage(), e);
            return Map.of(
                "success", false,
                "message", "Erreur lors du paiement: " + e.getMessage()
            );
        }
    }
    
    /**
     * Calcule le montant total d'une prescription en sommant les prix des médicaments
     */
    private BigDecimal calculatePrescriptionTotal(Prescription prescription) {
        return prescription.getItems().stream()
            .map(item -> {
                BigDecimal unitPrice = item.getMedication().getUnitPrice() != null 
                    ? item.getMedication().getUnitPrice() 
                    : BigDecimal.ZERO;
                Integer quantity = item.getQuantity() != null ? item.getQuantity() : 0;
                return unitPrice.multiply(BigDecimal.valueOf(quantity));
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    /**
     * Déduit le stock des médicaments après paiement
     */
    private void deductMedicationStock(Prescription prescription) {
        log.info("📦 [STOCK] Déduction du stock pour prescription {}", prescription.getId());
        
        prescription.getItems().forEach(item -> {
            Medication medication = item.getMedication();
            Integer quantity = item.getQuantity() != null ? item.getQuantity() : 0;
            
            if (quantity > 0) {
                Integer currentStock = medication.getStockQuantity() != null ? medication.getStockQuantity() : 0;
                Integer newStock = currentStock - quantity;
                
                if (newStock < 0) {
                    log.warn("⚠️ [STOCK] Stock insuffisant pour {} (demandé: {}, disponible: {})", 
                        medication.getName(), quantity, currentStock);
                    throw new RuntimeException("Stock insuffisant pour: " + medication.getName());
                }
                
                medication.setStockQuantity(newStock);
                medicationRepository.save(medication);
                
                log.info("✅ [STOCK] {} - Stock: {} -> {}", medication.getName(), currentStock, newStock);
            }
        });
    }

    private void createRevenueFromPrescription(Prescription prescription, Double amount, String paymentMethodStr, Long userId) {
        log.info("💰 [FINANCE] Création revenu pour prescription ID: {}", prescription.getId());
        
        // Vérification du montant (comme dans createRevenueFromPayment)
        if (amount == null || amount <= 0) {
            log.warn("⚠️ [FINANCE] Montant invalide pour création revenu: {}", amount);
            return;
        }
        
        // Convertir le paymentMethod string en enum avec gestion d'erreur (comme admission)
        PaymentMethod paymentMethod = PaymentMethod.ESPECES;
        try {
            if (paymentMethodStr != null) {
                paymentMethod = PaymentMethod.valueOf(paymentMethodStr.toUpperCase());
            }
        } catch (IllegalArgumentException e) {
            log.warn("⚠️ [FINANCE] Méthode de paiement non reconnue: {}, utilisation ESPECES", paymentMethodStr);
        }
        
        RevenueDTO revenueDTO = RevenueDTO.builder()
            .amount(BigDecimal.valueOf(amount))
            .currency(Currency.CDF)
            .paymentMethod(paymentMethod)
            .source(Revenue.RevenueSource.LABORATOIRE)
            .description("Prescription laboratoire - " + prescription.getPrescriptionCode())
            .date(LocalDateTime.now())
            .build();
        
        revenueService.createRevenue(revenueDTO, userId != null ? userId : 1L);
        log.info("✅ [FINANCE] Revenu créé pour prescription: {} CDF", amount);
    }

    public Map<String, Object> getPendingPrescriptions() {
        log.info("📋 [NOUVEAU FLUX] Récupération prescriptions validées par la pharmacie (en attente de paiement)");
        
        try {
            List<Prescription> pendingPrescriptions = prescriptionRepository.findByStatus(
                PrescriptionStatus.VALIDEE,
                org.springframework.data.domain.Pageable.unpaged()
            ).getContent();
            
            log.info("✅ [NOUVEAU FLUX] {} prescriptions en attente de paiement trouvées", pendingPrescriptions.size());
            
            return Map.of(
                "success", true,
                "data", pendingPrescriptions,
                "count", pendingPrescriptions.size()
            );
        } catch (Exception e) {
            log.error("❌ [NOUVEAU FLUX] ERREUR récupération prescriptions: {}", e.getMessage(), e);
            return Map.of(
                "success", false,
                "message", "Erreur lors de la récupération: " + e.getMessage()
            );
        }
    }
}
