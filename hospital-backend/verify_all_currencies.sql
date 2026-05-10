-- =====================================================
-- SCRIPT: Vérifier l'état final des devises
-- =====================================================

-- 1. Vérifier TOUS les médicaments
SELECT 
    COALESCE(sale_currency, 'NULL') as devise,
    COUNT(*) as nombre,
    MIN(unit_price) as prix_min,
    MAX(unit_price) as prix_max
FROM medications
GROUP BY sale_currency
ORDER BY devise;

-- 2. Vérifier les médicaments qui ont encore sale_currency = NULL
SELECT id, name, unit_price, sale_currency, purchase_currency
FROM medications
WHERE sale_currency IS NULL
ORDER BY id;

-- 3. Vérifier les factures pharmacie par devise
SELECT 
    COALESCE(currency, 'NULL') as devise,
    status,
    COUNT(*) as nombre,
    SUM(total_amount) as montant_total
FROM invoices
WHERE department_source = 'PHARMACY'
GROUP BY currency, status
ORDER BY devise, status;
