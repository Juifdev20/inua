-- =====================================================
-- SCRIPT: Corriger TOUTES les devises des médicaments
-- Gère aussi les médicaments bon marché en USD
-- =====================================================

-- 1. D'abord, mettre à jour ceux avec purchase_currency défini
UPDATE medications SET sale_currency = 'USD' WHERE purchase_currency = 'USD';
UPDATE medications SET sale_currency = 'CDF' WHERE purchase_currency = 'CDF';

-- 2. Afficher les médicaments restants avec sale_currency NULL
SELECT id, name, unit_price, sale_currency, purchase_currency
FROM medications
WHERE sale_currency IS NULL
ORDER BY unit_price;

-- =====================================================
-- 3. OPTION A: Si vous voulez marquer manuellement chaque médicament
-- Remplacez les IDs ci-dessous par les vrais IDs des médicaments en USD
-- =====================================================
/*
-- Médicaments en USD (même ceux à 0.23$ ou autres prix bas)
UPDATE medications 
SET sale_currency = 'USD', purchase_currency = 'USD'
WHERE id IN (5, 6, 7, 12, 13);  -- MODIFIEZ CES IDs

-- Médicaments en CDF
UPDATE medications 
SET sale_currency = 'CDF', purchase_currency = 'CDF'
WHERE id IN (11, 14);  -- MODIFIEZ CES IDs
*/

-- =====================================================
-- 4. OPTION B: Mettre tous les NULL en CDF par défaut
-- (Si vous êtes sûr que tous les nouveaux médicaments NULL sont en CDF)
-- =====================================================
UPDATE medications 
SET sale_currency = 'CDF', purchase_currency = 'CDF'
WHERE sale_currency IS NULL;

-- =====================================================
-- VÉRIFICATION FINALE
-- =====================================================
SELECT 
    COALESCE(sale_currency, 'NULL') as devise,
    COUNT(*) as nombre,
    MIN(unit_price) as prix_min,
    MAX(unit_price) as prix_max,
    STRING_AGG(DISTINCT name, ', ' ORDER BY name) as medicaments
FROM medications
GROUP BY sale_currency
ORDER BY devise;
