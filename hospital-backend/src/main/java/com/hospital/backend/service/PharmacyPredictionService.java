package com.hospital.backend.service;

import com.hospital.backend.dto.PharmacyPredictionDTO;
import com.hospital.backend.entity.Medication;
import com.hospital.backend.entity.PharmacyOrderItem;
import com.hospital.backend.entity.PharmacyOrderStatus;
import com.hospital.backend.repository.MedicationRepository;
import com.hospital.backend.repository.PharmacyOrderItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service de prédiction pour le réapprovisionnement de la pharmacie
 * Calcule les quantités suggérées basées sur la consommation moyenne mensuelle (CMM)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PharmacyPredictionService {

    private final MedicationRepository medicationRepository;
    private final PharmacyOrderItemRepository pharmacyOrderItemRepository;

    // Période d'analyse pour le calcul CMM (en mois)
    private static final int DEFAULT_ANALYSIS_MONTHS = 6;
    
    // Seuil pour considérer un stock comme critique (jours de couverture)
    private static final int CRITICAL_STOCK_DAYS = 15;
    
    // Seuil pour considérer un stock comme faible (jours de couverture)
    private static final int LOW_STOCK_DAYS = 30;

    /**
     * Calcule les prédictions de réapprovisionnement pour tous les médicaments actifs
     * 
     * @param monthsToCover Nombre de mois à couvrir
     * @return Liste des prédictions triées par priorité (critique d'abord)
     */
    @Transactional(readOnly = true)
    public List<PharmacyPredictionDTO> calculatePredictions(int monthsToCover) {
        log.info("Calcul des prédictions de réapprovisionnement pour {} mois de couverture", monthsToCover);
        
        List<Medication> medications = medicationRepository.findByIsActiveTrue();
        
        LocalDateTime analysisStartDate = LocalDateTime.now().minusMonths(DEFAULT_ANALYSIS_MONTHS);
        
        List<PharmacyPredictionDTO> predictions = medications.stream()
            .map(med -> calculatePredictionForMedication(med, monthsToCover, analysisStartDate))
            .sorted(Comparator
                .comparing(PharmacyPredictionDTO::getStatus, this::compareStatusPriority)
                .thenComparing(PharmacyPredictionDTO::getSuggestedQuantity, Comparator.reverseOrder()))
            .collect(Collectors.toList());
        
        log.info("Prédictions calculées: {} médicaments analysés", predictions.size());
        return predictions;
    }

    /**
     * Calcule les prédictions filtrées par fournisseur
     */
    @Transactional(readOnly = true)
    public List<PharmacyPredictionDTO> calculatePredictionsBySupplier(int monthsToCover, String supplier) {
        return calculatePredictions(monthsToCover).stream()
            .filter(pred -> pred.getSupplier() != null && 
                   pred.getSupplier().toLowerCase().contains(supplier.toLowerCase()))
            .collect(Collectors.toList());
    }

    /**
     * Calcule le budget total estimé pour une liste de prédictions
     */
    public BigDecimal calculateTotalBudget(List<PharmacyPredictionDTO> predictions) {
        return predictions.stream()
            .map(PharmacyPredictionDTO::getEstimatedSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Calcule la prédiction pour un médicament spécifique
     */
    private PharmacyPredictionDTO calculatePredictionForMedication(
            Medication medication, 
            int monthsToCover, 
            LocalDateTime analysisStartDate) {
        
        // Calculer la CMM basée sur l'historique des ventes
        Double cmm = calculateCMM(medication.getId(), analysisStartDate);
        
        // Récupérer le stock actuel
        Integer currentStock = medication.getStockQuantity() != null ? medication.getStockQuantity() : 0;
        Integer minimumStock = medication.getMinimumStock() != null ? medication.getMinimumStock() : 10;
        
        // Déterminer le prix d'achat
        BigDecimal unitPrice = medication.getPrice() != null ? medication.getPrice() : BigDecimal.ZERO;
        
        // Déterminer d'abord le statut basé sur les données de stock
        PharmacyPredictionDTO.PredictionStatus status = determineStatus(
            currentStock, minimumStock, cmm, 0); // suggestedQuantity=0 temporairement
        
        // Calculer la quantité suggérée avec prise en compte du statut
        // Si stock critique/faible, suggérer au moins le minimum stock
        Integer suggestedQuantity = calculateSuggestedQuantity(
            cmm, currentStock, monthsToCover, minimumStock, status);
        
        // Calculer le sous-total estimé
        BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(suggestedQuantity))
            .setScale(2, RoundingMode.HALF_UP);
        
        return PharmacyPredictionDTO.builder()
            .medicationId(medication.getId())
            .medicationName(medication.getName())
            .medicationCode(medication.getMedicationCode())
            .supplier(medication.getSupplier())
            .category(medication.getCategory())
            .currentStock(currentStock)
            .minimumStock(minimumStock)
            .cmm(cmm)
            .monthsToCover(monthsToCover)
            .suggestedQuantity(suggestedQuantity)
            .unitPurchasePrice(unitPrice)
            .estimatedSubtotal(subtotal)
            .status(status)
            .statusLabel(getStatusLabel(status))
            .build();
    }

    /**
     * Calcule la Consommation Moyenne Mensuelle (CMM)
     * Basée sur les quantités délivrées dans les commandes payées/livrées
     * Utilise une requête optimisée pour la période d'analyse
     */
    private Double calculateCMM(Long medicationId, LocalDateTime startDate) {
        try {
            LocalDateTime endDate = LocalDateTime.now();
            
            // Utiliser la requête optimisée pour récupérer le total délivré dans la période
            Integer totalDispensed = pharmacyOrderItemRepository
                .getTotalDispensedByMedicationAndDateRange(medicationId, startDate, endDate);
            
            // Si aucune vente, retourner 0 (stock dormant)
            if (totalDispensed == null || totalDispensed == 0) {
                return 0.0;
            }
            
            // CMM = total consommé / nombre de mois analysés
            return totalDispensed / (double) DEFAULT_ANALYSIS_MONTHS;
            
        } catch (Exception e) {
            log.error("Erreur lors du calcul de la CMM pour le médicament {}", medicationId, e);
            return 0.0;
        }
    }

    /**
     * Calcule la quantité suggérée à commander
     * 
     * Logique:
     * 1. Si CMM > 0: calcul standard (CMM × monthsToCover) - Stock Actuel
     * 2. Si stock critique (RUPTURE_IMMINENTE): commander jusqu'à atteindre minimumStock × 2
     * 3. Si stock faible (STOCK_FAIBLE): commander jusqu'à atteindre minimumStock
     * 4. Si stock dormant (CMM = 0 et stock OK): ne rien commander
     */
    private Integer calculateSuggestedQuantity(
            Double cmm, 
            Integer currentStock, 
            int monthsToCover,
            Integer minimumStock,
            PharmacyPredictionDTO.PredictionStatus status) {
        
        int baseSuggested = 0;
        
        // Calcul basé sur la CMM si disponible
        if (cmm != null && cmm > 0.0) {
            double neededByCMM = (cmm * monthsToCover) - currentStock;
            if (neededByCMM > 0) {
                baseSuggested = (int) Math.ceil(neededByCMM);
            }
        }
        
        // Gestion des stocks critiques/faibles
        if (status == PharmacyPredictionDTO.PredictionStatus.RUPTURE_IMMINENTE) {
            // Rupture imminente: commander pour atteindre minimumStock × 2 (buffer de sécurité)
            int neededForCritical = (minimumStock * 2) - currentStock;
            return Math.max(baseSuggested, Math.max(neededForCritical, minimumStock));
        }
        
        if (status == PharmacyPredictionDTO.PredictionStatus.STOCK_FAIBLE) {
            // Stock faible: commander pour atteindre au moins le minimum stock
            int neededForMinimum = minimumStock - currentStock;
            return Math.max(baseSuggested, Math.max(neededForMinimum, 0));
        }
        
        // Pour les autres cas, retourner le calcul basé sur la CMM
        return Math.max(baseSuggested, 0);
    }

    /**
     * Détermine le statut du stock
     */
    private PharmacyPredictionDTO.PredictionStatus determineStatus(
            Integer currentStock, 
            Integer minimumStock, 
            Double cmm,
            Integer suggestedQuantity) {
        
        // Stock dormant (pas de consommation)
        if (cmm == null || cmm == 0.0) {
            return PharmacyPredictionDTO.PredictionStatus.STOCK_DORMANT;
        }
        
        // Calculer les jours de couverture restants
        double dailyConsumption = cmm / 30.0; // CMM mensuelle → journalière
        int daysOfCoverage = dailyConsumption > 0 
            ? (int) (currentStock / dailyConsumption) 
            : 999;
        
        // Rupture imminente
        if (daysOfCoverage <= CRITICAL_STOCK_DAYS || currentStock <= minimumStock / 2) {
            return PharmacyPredictionDTO.PredictionStatus.RUPTURE_IMMINENTE;
        }
        
        // Stock faible
        if (daysOfCoverage <= LOW_STOCK_DAYS || currentStock <= minimumStock) {
            return PharmacyPredictionDTO.PredictionStatus.STOCK_FAIBLE;
        }
        
        // Stock OK
        return PharmacyPredictionDTO.PredictionStatus.STOCK_OK;
    }

    /**
     * Retourne le label du statut
     */
    private String getStatusLabel(PharmacyPredictionDTO.PredictionStatus status) {
        return switch (status) {
            case RUPTURE_IMMINENTE -> "Rupture Imminente";
            case STOCK_FAIBLE -> "Stock Faible";
            case STOCK_DORMANT -> "Stock Dormant";
            case STOCK_OK -> "Stock OK";
        };
    }

    /**
     * Compare les statuts par priorité (pour le tri)
     */
    private int compareStatusPriority(PharmacyPredictionDTO.PredictionStatus s1, 
                                      PharmacyPredictionDTO.PredictionStatus s2) {
        Map<PharmacyPredictionDTO.PredictionStatus, Integer> priority = Map.of(
            PharmacyPredictionDTO.PredictionStatus.RUPTURE_IMMINENTE, 0,
            PharmacyPredictionDTO.PredictionStatus.STOCK_FAIBLE, 1,
            PharmacyPredictionDTO.PredictionStatus.STOCK_DORMANT, 2,
            PharmacyPredictionDTO.PredictionStatus.STOCK_OK, 3
        );
        return Integer.compare(priority.get(s1), priority.get(s2));
    }
}
