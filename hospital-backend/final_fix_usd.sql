-- =====================================================
-- SCRIPT FINAL: Mettre les 6 médicaments restants en USD
-- =====================================================

-- Tous ces médicaments sont en DOLLAR (USD)
UPDATE medications 
SET sale_currency = 'USD', 
    purchase_currency = 'USD'
WHERE id IN (5, 6, 11, 12, 13, 14);

-- VÉRIFICATION: Tous les médicaments doivent avoir une devise
SELECT 
    COALESCE(sale_currency, 'NULL') as devise,
    COUNT(*) as nombre,
    MIN(unit_price) as prix_min,
    MAX(unit_price) as prix_max
FROM medications
GROUP BY sale_currency
ORDER BY devise;

-- DÉTAIL PAR MÉDICAMENT
SELECT id, name, unit_price, sale_currency, purchase_currency
FROM medications
ORDER BY id;
