-- Migration: Ajout du statut et du lien vers transaction finance pour les mouvements de stock
-- Date: 2024-05-07
-- Objectif: Permettre le workflow de validation finance pour les achats de médicaments

-- Ajout de la colonne status
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'VALIDE';

-- Ajout de la colonne finance_transaction_id
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS finance_transaction_id BIGINT;

-- Création d'un index pour optimiser les recherches par statut
CREATE INDEX IF NOT EXISTS idx_stock_movements_status ON stock_movements(status);

-- Création d'un index pour optimiser les recherches par transaction finance
CREATE INDEX IF NOT EXISTS idx_stock_movements_finance_txn ON stock_movements(finance_transaction_id);

-- Mise à jour des mouvements existants (par défaut VALIDE pour compatibilité)
UPDATE stock_movements 
SET status = 'VALIDE' 
WHERE status IS NULL;

-- Commentaires sur les colonnes
COMMENT ON COLUMN stock_movements.status IS 'Statut du mouvement: EN_ATTENTE_VALIDATION, VALIDE, ANNULE, REJETE';
COMMENT ON COLUMN stock_movements.finance_transaction_id IS 'ID de la transaction finance associée (pour les achats en attente)';
