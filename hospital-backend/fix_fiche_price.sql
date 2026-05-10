-- CORRECTION URGENTE : Mettre à jour le prix de la fiche à 3 USD

-- 1. Vérifier la valeur actuelle
SELECT id, fiche_price, fiche_price_currency FROM hospital_config;

-- 2. Corriger le prix à 3 USD (valeur correcte)
UPDATE hospital_config 
SET fiche_price = 3,
    fiche_price_currency = 'USD'
WHERE fiche_price IS NULL 
   OR fiche_price > 100;  -- Si prix > 100, c'est probablement l'ancienne valeur en CDF

-- 3. Vérifier la correction
SELECT id, fiche_price, fiche_price_currency FROM hospital_config;
