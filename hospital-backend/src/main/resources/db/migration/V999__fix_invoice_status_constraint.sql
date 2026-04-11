-- Fix: Mettre à jour la contrainte CHECK pour accepter tous les statuts InvoiceStatus
-- Le statut 'PAYEE' manquait dans la contrainte PostgreSQL

-- Supprimer l'ancienne contrainte si elle existeALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Recréer la contrainte avec tous les statuts valides
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
    CHECK (status IN ('EN_ATTENTE', 'PAYEE', 'PARTIELLEMENT_PAYEE', 'ANNULEE', 'REMBOURSEE'));
