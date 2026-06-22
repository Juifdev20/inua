package com.hospital.backend.repository;

import com.hospital.backend.entity.FinanceTransaction;
import com.hospital.backend.entity.TransactionStatus;
import com.hospital.backend.entity.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository pour les transactions finance
 * Gère les requêtes complexes pour le flux Pharmacie-Finance
 */
@Repository
public interface FinanceTransactionRepository extends JpaRepository<FinanceTransaction, Long> {

    /**
     * Trouve une transaction par l'ID de commande pharmacie associée
     */
    Optional<FinanceTransaction> findByCommandePharmacieId(Long commandePharmacieId);

    /**
     * Trouve une transaction par commande pharmacie et type
     */
    Optional<FinanceTransaction> findByCommandePharmacieIdAndType(Long commandePharmacieId, TransactionType type);

    /**
     * Liste toutes les transactions liées à une commande pharmacie
     */
    List<FinanceTransaction> findAllByCommandePharmacieId(Long commandePharmacieId);

    /**
     * Trouve la transaction originale corrigée par une transaction donnée
     */
    Optional<FinanceTransaction> findByTransactionCorrectriceId(Long correctriceId);

    /**
     * Liste les transactions en attente de validation (scan manquant)
     */
    List<FinanceTransaction> findByStatusOrderByCreatedAtDesc(TransactionStatus status);

    // ★ MULTI-TENANT: filtrer par hôpital du créateur
    @Query("SELECT ft FROM FinanceTransaction ft WHERE ft.status = :status AND ft.createdBy.hospital.id = :hospitalId ORDER BY ft.createdAt DESC")
    List<FinanceTransaction> findByStatusAndHospitalId(@Param("status") TransactionStatus status, @Param("hospitalId") Long hospitalId);

    @Query("SELECT ft FROM FinanceTransaction ft WHERE ft.status = :status AND ft.type = :type AND ft.createdBy.hospital.id = :hospitalId ORDER BY ft.dateEcheancePaiement ASC")
    List<FinanceTransaction> findDettesFournisseursByHospital(@Param("status") TransactionStatus status, @Param("type") TransactionType type, @Param("hospitalId") Long hospitalId);

    @Query("SELECT ft FROM FinanceTransaction ft WHERE ft.createdBy.hospital.id = :hospitalId ORDER BY ft.createdAt DESC")
    org.springframework.data.domain.Page<FinanceTransaction> findByHospitalId(@Param("hospitalId") Long hospitalId, org.springframework.data.domain.Pageable pageable);

    /**
     * Liste les transactions par type (tous statuts)
     */
    List<FinanceTransaction> findByTypeOrderByCreatedAtDesc(TransactionType type);

    /**
     * Liste les transactions en attente avec pagination
     */
    Page<FinanceTransaction> findByStatus(TransactionStatus status, Pageable pageable);

    /**
     * Liste les dépenses à payer (crédits fournisseurs)
     */
    @Query("SELECT ft FROM FinanceTransaction ft WHERE ft.status = :status AND ft.type = :type ORDER BY ft.dateEcheancePaiement ASC")
    List<FinanceTransaction> findDettesFournisseurs(
            @Param("status") TransactionStatus status, 
            @Param("type") TransactionType type);

    /**
     * Calcul du total des dépenses par période
     */
    @Query("SELECT SUM(ft.montant) FROM FinanceTransaction ft WHERE ft.status IN ('PAYE', 'A_PAYER') AND ft.type = 'DEPENSE' AND ft.createdAt BETWEEN :debut AND :fin")
    BigDecimal sumDepensesByPeriode(@Param("debut") LocalDateTime debut, @Param("fin") LocalDateTime fin);

    /**
     * Liste les transactions par caisse
     */
    List<FinanceTransaction> findByCaisseIdOrderByCreatedAtDesc(Long caisseId);

    /**
     * Vérifie si une commande pharmacie a déjà une transaction
     */
    boolean existsByCommandePharmacieIdAndType(Long commandePharmacieId, TransactionType type);

    /**
     * Recherche par référence fournisseur (facture)
     */
    List<FinanceTransaction> findByReferenceFournisseurContainingIgnoreCase(String reference);

    /**
     * Transactions en attente depuis plus de N heures (alerte)
     */
    @Query("SELECT ft FROM FinanceTransaction ft WHERE ft.status = 'EN_ATTENTE_SCAN' AND ft.createdAt < :dateLimite")
    List<FinanceTransaction> findEnAttenteDepuis(@Param("dateLimite") LocalDateTime dateLimite);

    /**
     * Liste les transactions par type et période de création
     */
    List<FinanceTransaction> findByTypeAndCreatedAtBetween(TransactionType type, LocalDateTime start, LocalDateTime end);

    // ★ MULTI-TENANT
    @Query("SELECT ft FROM FinanceTransaction ft WHERE ft.type = :type AND ft.createdAt BETWEEN :start AND :end AND ft.createdBy.hospital.id = :hospitalId")
    List<FinanceTransaction> findByTypeAndCreatedAtBetweenAndHospital(@Param("type") TransactionType type, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end, @Param("hospitalId") Long hospitalId);
}
