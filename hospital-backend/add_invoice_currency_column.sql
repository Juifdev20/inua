-- =====================================================
-- SCRIPT: Ajouter la colonne currency à la table invoices
-- =====================================================

-- 1. Ajouter la colonne currency (nullable pour compatibilité)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

-- 2. Mettre à jour les factures existantes avec CDF par défaut
UPDATE invoices 
SET currency = 'CDF' 
WHERE currency IS NULL;

-- 3. Optionnel: Ajouter une contrainte pour les valeurs valides
-- ALTER TABLE invoices 
-- ADD CONSTRAINT invoices_currency_check 
-- CHECK (currency IN ('CDF', 'USD'));

-- 4. Vérification
SELECT id, invoice_code, total_amount, currency 
FROM invoices 
ORDER BY id DESC 
LIMIT 10;
