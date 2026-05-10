-- Migration pour corriger les colonnes currency avec des valeurs nulles
-- Compatible Supabase
-- Date: 2026-04-17

-- Pour la table revenues
-- D'abord ajouter la colonne comme nullable si elle n'existe pas
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

-- Mettre à jour toutes les valeurs nulles à 'CDF'
UPDATE revenues SET currency = 'CDF' WHERE currency IS NULL;

-- Rendre la colonne NOT NULL avec valeur par défaut
ALTER TABLE revenues ALTER COLUMN currency SET NOT NULL;
ALTER TABLE revenues ALTER COLUMN currency SET DEFAULT 'CDF';

-- Pour la table expenses
-- D'abord ajouter la colonne comme nullable si elle n'existe pas
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

-- Mettre à jour toutes les valeurs nulles à 'CDF'
UPDATE expenses SET currency = 'CDF' WHERE currency IS NULL;

-- Rendre la colonne NOT NULL avec valeur par défaut
ALTER TABLE expenses ALTER COLUMN currency SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN currency SET DEFAULT 'CDF';
