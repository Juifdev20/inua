-- Fix pharmacy_orders status constraint to include all enum values
-- Remove old constraint if exists
ALTER TABLE pharmacy_orders DROP CONSTRAINT IF EXISTS pharmacy_orders_status_check;

-- Add new constraint with all valid status values
ALTER TABLE pharmacy_orders ADD CONSTRAINT pharmacy_orders_status_check
    CHECK (status IN (
        'EN_ATTENTE',
        'EN_PREPARATION',
        'PRETE',
        'EN_ATTENTE_PAIEMENT',
        'PAYEE',
        'LIVREE',
        'ANNULEE',
        'PARTIELLEMENT_LIVREE'
    ));
