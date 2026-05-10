-- =====================================================
-- SCRIPT: Corriger les devises NULL des médicaments
-- =====================================================

-- Vérifier d'abord quels médicaments ont des prix élevés (probablement USD)
SELECT id, name, unit_price, sale_currency, purchase_currency
FROM medications
WHERE sale_currency IS NULL
ORDER BY unit_price DESC;

-- =====================================================
-- OPTION 1: Mettre à jour par ID spécifique
-- (Si vous connaissez les IDs des médicaments en USD)
-- =====================================================
/*
UPDATE medications 
SET sale_currency = 'USD',
    purchase_currency = 'USD'
WHERE id IN (2, 3, 8, 10, 16, 17);  -- REMPLACER par vos IDs réels
*/

-- =====================================================
-- OPTION 2: Utiliser le prix comme indicateur
-- Si prix > 100 = USD, sinon = CDF
-- =====================================================

-- Médicaments chers (> 100) -> USD
UPDATE medications 
SET sale_currency = 'USD',
    purchase_currency = 'USD'
WHERE sale_currency IS NULL 
  AND unit_price > 100;

-- Médicaments bon marché (<= 100) -> CDF  
UPDATE medications 
SET sale_currency = 'CDF',
    purchase_currency = 'CDF'
WHERE sale_currency IS NULL 
  AND unit_price <= 100;

-- =====================================================
-- VÉRIFICATION FINALE
-- =====================================================
SELECT 
    COALESCE(sale_currency, 'NULL') as devise,
    COUNT(*) as nombre,
    MIN(unit_price) as prix_min,
    MAX(unit_price) as prix_max,
    STRING_AGG(DISTINCT name, ', ') as exemples
FROM medications
GROUP BY sale_currency
ORDER BY devise;
