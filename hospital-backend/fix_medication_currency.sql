-- =====================================================
-- SCRIPT: Corriger les devises des médicaments
-- =====================================================

-- IMPORTANT: Avant d'exécuter, vérifiez quels médicaments sont en USD!
-- Exemple: Ceux avec un prix unitaire > 100 sont souvent en USD

-- 1. Identifier les médicaments qui pourraient être en USD
-- (adapter le seuil selon votre contexte)
SELECT id, name, unit_price, sale_currency
FROM medications
WHERE unit_price > 100 
   OR name ILIKE '%import%'
   OR name ILIKE '%international%'
ORDER BY unit_price DESC;

-- 2. Si vous êtes sûr que certains médicaments sont en USD, mettez à jour:
-- REMPLACEZ (1, 2, 3) par les IDs réels des médicaments en USD
/*
UPDATE medications 
SET sale_currency = 'USD',
    purchase_currency = 'USD'
WHERE id IN (1, 2, 3);  -- METTRE LES IDs RÉELS ICI
*/

-- 3. Mettre tous les médicaments sans devise en CDF (par défaut)
UPDATE medications 
SET sale_currency = 'CDF',
    purchase_currency = 'CDF'
WHERE sale_currency IS NULL;

-- 4. Vérification finale
SELECT 
    COALESCE(sale_currency, 'NULL') as devise,
    COUNT(*) as nombre,
    MIN(unit_price) as prix_min,
    MAX(unit_price) as prix_max,
    AVG(unit_price)::numeric(10,2) as prix_moyen
FROM medications
GROUP BY sale_currency
ORDER BY devise;
