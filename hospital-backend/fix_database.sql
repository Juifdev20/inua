-- Fix pour ajouter la colonne fiche_price_currency à hospital_config

-- 1. Ajouter la colonne sans contrainte NOT NULL
ALTER TABLE hospital_config 
ADD COLUMN IF NOT EXISTS fiche_price_currency VARCHAR(10);

-- 2. Mettre à jour les valeurs existantes avec USD par défaut
UPDATE hospital_config 
SET fiche_price_currency = 'USD' 
WHERE fiche_price_currency IS NULL;

-- 3. Vérifier le résultat
SELECT id, fiche_price, fiche_price_currency FROM hospital_config;

-- 4. (Optionnel) Ajouter la contrainte après que toutes les lignes ont une valeur
-- ALTER TABLE hospital_config 
-- ALTER COLUMN fiche_price_currency SET NOT NULL;
