-- Ajout de la colonne justificatif_url à finance_transactions
-- Permet de stocker l'URL de la pièce justificative uploadée par la pharmacie

ALTER TABLE finance_transactions
ADD COLUMN IF NOT EXISTS justificatif_url VARCHAR(500);

-- Index pour rechercher rapidement les transactions avec justificatif
CREATE INDEX IF NOT EXISTS idx_finance_transactions_justificatif
ON finance_transactions(justificatif_url) WHERE justificatif_url IS NOT NULL;

COMMENT ON COLUMN finance_transactions.justificatif_url IS 
'URL de la pièce justificative (facture, bon de livraison) uploadée par la pharmacie. Consultée par la finance avant validation.';
