package com.hospital.backend.repository;

import com.hospital.backend.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findByMedicationIdOrderByCreatedAtDesc(Long medicationId);

    List<StockMovement> findByReferenceIdAndReferenceType(Long referenceId, String referenceType);

    List<StockMovement> findByMovementType(StockMovement.MovementType movementType);
    
    /**
     * 🔧 RECHERCHE PAR TRANSACTION FINANCE
     * Trouve le mouvement de stock lié à une transaction finance
     * Utilisé pour le workflow de validation finance des achats
     */
    List<StockMovement> findByFinanceTransactionId(Long financeTransactionId);
    
    /**
     * 🔧 RECHERCHE DES MOUVEMENTS EN ATTENTE
     * Trouve tous les mouvements en attente de validation finance
     */
    List<StockMovement> findByStatus(StockMovement.MovementStatus status);
}
