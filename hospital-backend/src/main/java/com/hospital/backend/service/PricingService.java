package com.hospital.backend.service;

import com.hospital.backend.entity.PriceListType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Service de tarification pour le calcul automatique des montants
 * lors des admissions et consultations.
 */
public interface PricingService {

    /**
     * Récupère le prix actuel d'un type de service
     * @param type Le type de service (FICHE, CONSULTATION_GENERALE, etc.)
     * @return Le prix unitaire ou null si non trouvé
     */
    BigDecimal getCurrentPrice(PriceListType type);

    /**
     * Récupère tous les prix actifs de la grille tarifaire
     * @return Liste des prix actifs
     */
    List<Map<String, Object>> getAllActivePrices();

    /**
     * Calcule le montant total pour une admission :
     * - Fiche (si nouveau patient)
     * - Consultation (selon le service choisi)
     * 
     * @param patientId ID du patient
     * @param serviceId ID du service médical
     * @return Map contenant les détails du calcul (ficheAmount, consulAmount, total)
     */
    Map<String, Object> calculateAdmissionAmount(Long patientId, Long serviceId);

    /**
     * Vérifie si le patient a déjà payé la fiche (validité 12 mois)
     * et retourne le montant de la fiche à payer (0 si déjà payée)
     * 
     * @param patientId ID du patient
     * @return Le montant de la fiche à payer (0 si exonéré)
     */
    BigDecimal getFicheAmount(Long patientId);

    /**
     * Vérifie si le patient possède une fiche active (payée dans les 12 derniers mois)
     * @param patientId ID du patient
     * @return true si le patient a une fiche active
     */
    boolean hasActiveFile(Long patientId);

    /**
     * Récupère la date de dernière paiement de la fiche
     * @param patientId ID du patient
     * @return La date du dernier paiement ou null
     */
    LocalDateTime getLastFichePaymentDate(Long patientId);

    /**
     * Met à jour un prix dans la grille tarifaire
     * @param id ID du prix à modifier
     * @param newPrice Nouveau prix
     * @return Le prix mis à jour
     */
    Map<String, Object> updatePrice(Long id, BigDecimal newPrice);

    /**
     * Crée un nouveau prix dans la grille
     * @param priceData Données du prix
     * @return Le prix créé
     */
    Map<String, Object> createPrice(Map<String, Object> priceData);

    /**
     * Initialise la grille tarifaire avec les valeurs par défaut
     * (Appelé au démarrage de l'application si la grille est vide)
     */
    void initializeDefaultPrices();
}

