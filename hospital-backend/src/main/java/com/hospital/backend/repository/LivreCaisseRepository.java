package com.hospital.backend.repository;

import com.hospital.backend.dto.LivreCaisseDTO;
import com.hospital.backend.entity.Currency;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository pour le Livre de Caisse
 * Combine les Revenues (entrées) et Expenses (sorties).
 * Les dépenses validées par Finance sont déjà représentées par des Expenses via ExpenseCreationService
 * pour éviter le double comptage avec FinanceTransaction.
 */
@Repository
public interface LivreCaisseRepository extends JpaRepository<com.hospital.backend.entity.Revenue, Long> {

    /**
     * Récupère toutes les transactions (Revenues + Expenses) pour une période
     * Utilisé pour la vue détaillée avec pagination
     */
    @Query(value = """
        SELECT 
            t.id,
            t.date as transaction_date,
            t.type,
            t.description,
            t.document,
            t.devise,
            t.montant,
            t.patient_nom,
            t.patient_prenom,
            t.patient_code,
            t.caissier_id,
            t.caissier_nom,
            t.medecin_nom,
            t.source
        FROM (
            SELECT 
                r.id,
                r.date,
                'ENTREE' as type,
                r.description,
                COALESCE(r.receipt_number, CONCAT('REC-', r.id)) as document,
                r.currency as devise,
                r.amount as montant,
                p.last_name as patient_nom,
                p.first_name as patient_prenom,
                p.patient_code,
                u.id as caissier_id,
                CONCAT(u.first_name, ' ', u.last_name) as caissier_nom,
                NULL as medecin_nom,
                r.source as source,
                r.created_at
            FROM revenues r
            LEFT JOIN users u ON r.created_by_id = u.id
            LEFT JOIN invoices i ON r.reference_invoice_id = i.id
            LEFT JOIN patients p ON i.patient_id = p.id
            WHERE CAST(r.date AS DATE) BETWEEN :dateDebut AND :dateFin
            
            UNION ALL
            
            SELECT 
                e.id + 1000000 as id,
                e.date,
                'SORTIE' as type,
                e.description,
                CONCAT('DEP-', e.id) as document,
                e.currency as devise,
                e.amount as montant,
                NULL as patient_nom,
                NULL as patient_prenom,
                NULL as patient_code,
                u.id as caissier_id,
                CONCAT(u.first_name, ' ', u.last_name) as caissier_nom,
                NULL as medecin_nom,
                e.category as source,
                e.created_at
            FROM expenses e
            LEFT JOIN users u ON e.created_by_id = u.id
            WHERE CAST(e.date AS DATE) BETWEEN :dateDebut AND :dateFin
            
        ) t
        ORDER BY t.date, t.created_at
        """,
        countQuery = """
        SELECT COUNT(*) FROM (
            SELECT r.id FROM revenues r 
            WHERE CAST(r.date AS DATE) BETWEEN :dateDebut AND :dateFin
            UNION ALL
            SELECT e.id + 1000000 FROM expenses e 
            WHERE CAST(e.date AS DATE) BETWEEN :dateDebut AND :dateFin
        ) as count_table
        """,
        nativeQuery = true)
    Page<Object[]> findTransactionsByPeriode(
            @Param("dateDebut") LocalDate dateDebut,
            @Param("dateFin") LocalDate dateFin,
            Pageable pageable);

    /**
     * Récupère toutes les transactions pour une période et un caissier spécifique
     */
    @Query(value = """
        SELECT 
            t.id,
            t.date as transaction_date,
            t.type,
            t.description,
            t.document,
            t.devise,
            t.montant,
            t.patient_nom,
            t.patient_prenom,
            t.patient_code,
            t.caissier_id,
            t.caissier_nom,
            t.medecin_nom,
            t.source
        FROM (
            SELECT 
                r.id,
                r.date,
                'ENTREE' as type,
                r.description,
                COALESCE(r.receipt_number, CONCAT('REC-', r.id)) as document,
                r.currency as devise,
                r.amount as montant,
                p.last_name as patient_nom,
                p.first_name as patient_prenom,
                p.patient_code,
                u.id as caissier_id,
                CONCAT(u.first_name, ' ', u.last_name) as caissier_nom,
                NULL as medecin_nom,
                r.source as source,
                r.created_at
            FROM revenues r
            LEFT JOIN users u ON r.created_by_id = u.id
            LEFT JOIN invoices i ON r.reference_invoice_id = i.id
            LEFT JOIN patients p ON i.patient_id = p.id
            WHERE CAST(r.date AS DATE) BETWEEN :dateDebut AND :dateFin
              AND u.id = :caissierId
            
            UNION ALL
            
            SELECT 
                e.id + 1000000 as id,
                e.date,
                'SORTIE' as type,
                e.description,
                CONCAT('DEP-', e.id) as document,
                e.currency as devise,
                e.amount as montant,
                NULL as patient_nom,
                NULL as patient_prenom,
                NULL as patient_code,
                u.id as caissier_id,
                CONCAT(u.first_name, ' ', u.last_name) as caissier_nom,
                NULL as medecin_nom,
                e.category as source,
                e.created_at
            FROM expenses e
            LEFT JOIN users u ON e.created_by_id = u.id
            WHERE CAST(e.date AS DATE) BETWEEN :dateDebut AND :dateFin
              AND u.id = :caissierId
            
        ) t
        ORDER BY t.date, t.created_at
        """,
        nativeQuery = true)
    List<Object[]> findTransactionsByPeriodeAndCaissier(
            @Param("dateDebut") LocalDate dateDebut,
            @Param("dateFin") LocalDate dateFin,
            @Param("caissierId") Long caissierId);

    // ★ MULTI-TENANT: filtrer par hôpital
    @Query(value = """
        SELECT t.id, t.date as transaction_date, t.type, t.description, t.document,
               t.devise, t.montant, t.patient_nom, t.patient_prenom, t.patient_code,
               t.caissier_id, t.caissier_nom, t.medecin_nom, t.source
        FROM (
            SELECT r.id, r.date, 'ENTREE' as type, r.description,
                   COALESCE(r.receipt_number, CONCAT('REC-', r.id)) as document,
                   r.currency as devise, r.amount as montant,
                   p.last_name as patient_nom, p.first_name as patient_prenom, p.patient_code,
                   u.id as caissier_id, CONCAT(u.first_name, ' ', u.last_name) as caissier_nom,
                   NULL as medecin_nom, r.source as source, r.created_at
            FROM revenues r
            LEFT JOIN users u ON r.created_by_id = u.id
            LEFT JOIN invoices i ON r.reference_invoice_id = i.id
            LEFT JOIN patients p ON i.patient_id = p.id
            WHERE CAST(r.date AS DATE) BETWEEN :dateDebut AND :dateFin
              AND u.hospital_id = :hospitalId
            UNION ALL
            SELECT e.id + 1000000 as id, e.date, 'SORTIE' as type, e.description,
                   CONCAT('DEP-', e.id) as document,
                   e.currency as devise, e.amount as montant,
                   NULL, NULL, NULL,
                   u.id as caissier_id, CONCAT(u.first_name, ' ', u.last_name) as caissier_nom,
                   NULL, e.category as source, e.created_at
            FROM expenses e
            LEFT JOIN users u ON e.created_by_id = u.id
            WHERE CAST(e.date AS DATE) BETWEEN :dateDebut AND :dateFin
              AND u.hospital_id = :hospitalId
        ) t
        ORDER BY t.date, t.created_at
        """,
        countQuery = """
        SELECT COUNT(*) FROM (
            SELECT r.id FROM revenues r LEFT JOIN users u ON r.created_by_id = u.id
            WHERE CAST(r.date AS DATE) BETWEEN :dateDebut AND :dateFin AND u.hospital_id = :hospitalId
            UNION ALL
            SELECT e.id + 1000000 FROM expenses e LEFT JOIN users u ON e.created_by_id = u.id
            WHERE CAST(e.date AS DATE) BETWEEN :dateDebut AND :dateFin AND u.hospital_id = :hospitalId
        ) as count_table
        """,
        nativeQuery = true)
    Page<Object[]> findTransactionsByPeriodeAndHospital(
            @Param("dateDebut") LocalDate dateDebut,
            @Param("dateFin") LocalDate dateFin,
            @Param("hospitalId") Long hospitalId,
            Pageable pageable);

    @Query(value = """
        SELECT t.id, t.date as transaction_date, t.type, t.description, t.document,
               t.devise, t.montant, t.patient_nom, t.patient_prenom, t.patient_code,
               t.caissier_id, t.caissier_nom, t.medecin_nom, t.source
        FROM (
            SELECT r.id, r.date, 'ENTREE' as type, r.description,
                   COALESCE(r.receipt_number, CONCAT('REC-', r.id)) as document,
                   r.currency as devise, r.amount as montant,
                   p.last_name as patient_nom, p.first_name as patient_prenom, p.patient_code,
                   u.id as caissier_id, CONCAT(u.first_name, ' ', u.last_name) as caissier_nom,
                   NULL as medecin_nom, r.source as source, r.created_at
            FROM revenues r
            LEFT JOIN users u ON r.created_by_id = u.id
            LEFT JOIN invoices i ON r.reference_invoice_id = i.id
            LEFT JOIN patients p ON i.patient_id = p.id
            WHERE CAST(r.date AS DATE) BETWEEN :dateDebut AND :dateFin
              AND u.id = :caissierId AND u.hospital_id = :hospitalId
            UNION ALL
            SELECT e.id + 1000000 as id, e.date, 'SORTIE' as type, e.description,
                   CONCAT('DEP-', e.id) as document,
                   e.currency as devise, e.amount as montant,
                   NULL, NULL, NULL,
                   u.id as caissier_id, CONCAT(u.first_name, ' ', u.last_name) as caissier_nom,
                   NULL, e.category as source, e.created_at
            FROM expenses e
            LEFT JOIN users u ON e.created_by_id = u.id
            WHERE CAST(e.date AS DATE) BETWEEN :dateDebut AND :dateFin
              AND u.id = :caissierId AND u.hospital_id = :hospitalId
        ) t
        ORDER BY t.date, t.created_at
        """,
        nativeQuery = true)
    List<Object[]> findTransactionsByPeriodeCaissierAndHospital(
            @Param("dateDebut") LocalDate dateDebut,
            @Param("dateFin") LocalDate dateFin,
            @Param("caissierId") Long caissierId,
            @Param("hospitalId") Long hospitalId);

    /**
     * Calcule le solde d'ouverture (toutes transactions avant la date de début)
     * ★ INCLUT LES ACHATS MÉDICAMENTS (FinanceTransaction)
     */
    @Query(value = """
        SELECT
            COALESCE(SUM(CASE WHEN type = 'ENTREE' THEN montant ELSE 0 END), 0)
            -
            COALESCE(SUM(CASE WHEN type = 'SORTIE' THEN montant ELSE 0 END), 0)
        FROM (
            SELECT 'ENTREE' as type, r.amount as montant
            FROM revenues r
            WHERE r.currency = :currencyCode
            AND CAST(r.date AS DATE) < :date

            UNION ALL

            SELECT 'SORTIE' as type, e.amount as montant
            FROM expenses e
            WHERE e.currency = :currencyCode
            AND CAST(e.date AS DATE) < :date

        ) t
        """,
        nativeQuery = true)
    BigDecimal calculateSoldeOuverture(
            @Param("date") LocalDate date,
            @Param("currencyCode") String currencyCode);

    /**
     * Récupère les totaux journaliers pour la vue synthétique
     */
    @Query(value = """
        SELECT 
            t.date_jour,
            SUM(CASE WHEN t.type = 'ENTREE' AND t.devise = 'USD' THEN t.montant ELSE 0 END) as entree_usd,
            SUM(CASE WHEN t.type = 'SORTIE' AND t.devise = 'USD' THEN t.montant ELSE 0 END) as sortie_usd,
            SUM(CASE WHEN t.type = 'ENTREE' AND t.devise = 'CDF' THEN t.montant ELSE 0 END) as entree_cdf,
            SUM(CASE WHEN t.type = 'SORTIE' AND t.devise = 'CDF' THEN t.montant ELSE 0 END) as sortie_cdf,
            COUNT(*) as nb_transactions
        FROM (
            SELECT 
                CAST(r.date AS DATE) as date_jour,
                'ENTREE' as type,
                r.currency as devise,
                r.amount as montant
            FROM revenues r
            WHERE CAST(r.date AS DATE) BETWEEN :dateDebut AND :dateFin
            
            UNION ALL
            
            SELECT 
                CAST(e.date AS DATE) as date_jour,
                'SORTIE' as type,
                e.currency as devise,
                e.amount as montant
            FROM expenses e
            WHERE CAST(e.date AS DATE) BETWEEN :dateDebut AND :dateFin
            
        ) t
        GROUP BY t.date_jour
        ORDER BY t.date_jour
        """,
        nativeQuery = true)
    List<Object[]> findSyntheseJournaliere(
            @Param("dateDebut") LocalDate dateDebut,
            @Param("dateFin") LocalDate dateFin);

    // ★ MULTI-TENANT: solde d'ouverture filtré par hôpital
    @Query(value = """
        SELECT
            COALESCE(SUM(CASE WHEN type = 'ENTREE' THEN montant ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN type = 'SORTIE' THEN montant ELSE 0 END), 0)
        FROM (
            SELECT 'ENTREE' as type, r.amount as montant
            FROM revenues r LEFT JOIN users u ON r.created_by_id = u.id
            WHERE r.currency = :currencyCode AND CAST(r.date AS DATE) < :date
              AND u.hospital_id = :hospitalId
            UNION ALL
            SELECT 'SORTIE' as type, e.amount as montant
            FROM expenses e LEFT JOIN users u ON e.created_by_id = u.id
            WHERE e.currency = :currencyCode AND CAST(e.date AS DATE) < :date
              AND u.hospital_id = :hospitalId
        ) t
        """,
        nativeQuery = true)
    BigDecimal calculateSoldeOuvertureByHospital(
            @Param("date") LocalDate date,
            @Param("currencyCode") String currencyCode,
            @Param("hospitalId") Long hospitalId);

    // ★ MULTI-TENANT: totaux journaliers filtrés par hôpital
    @Query(value = """
        SELECT t.date_jour,
            SUM(CASE WHEN t.type = 'ENTREE' AND t.devise = 'USD' THEN t.montant ELSE 0 END) as entree_usd,
            SUM(CASE WHEN t.type = 'SORTIE' AND t.devise = 'USD' THEN t.montant ELSE 0 END) as sortie_usd,
            SUM(CASE WHEN t.type = 'ENTREE' AND t.devise = 'CDF' THEN t.montant ELSE 0 END) as entree_cdf,
            SUM(CASE WHEN t.type = 'SORTIE' AND t.devise = 'CDF' THEN t.montant ELSE 0 END) as sortie_cdf,
            COUNT(*) as nb_transactions
        FROM (
            SELECT CAST(r.date AS DATE) as date_jour, 'ENTREE' as type, r.currency as devise, r.amount as montant
            FROM revenues r LEFT JOIN users u ON r.created_by_id = u.id
            WHERE CAST(r.date AS DATE) BETWEEN :dateDebut AND :dateFin AND u.hospital_id = :hospitalId
            UNION ALL
            SELECT CAST(e.date AS DATE) as date_jour, 'SORTIE' as type, e.currency as devise, e.amount as montant
            FROM expenses e LEFT JOIN users u ON e.created_by_id = u.id
            WHERE CAST(e.date AS DATE) BETWEEN :dateDebut AND :dateFin AND u.hospital_id = :hospitalId
        ) t
        GROUP BY t.date_jour ORDER BY t.date_jour
        """,
        nativeQuery = true)
    List<Object[]> findSyntheseJournaliereByHospital(
            @Param("dateDebut") LocalDate dateDebut,
            @Param("dateFin") LocalDate dateFin,
            @Param("hospitalId") Long hospitalId);
}
