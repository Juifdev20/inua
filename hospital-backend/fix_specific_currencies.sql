-- =====================================================
-- SCRIPT: Corriger les devises NULL médicament par médicament
-- Basé sur vos données réelles
-- =====================================================

-- 1. Médicaments avec purchase_currency = USD -> sale_currency = USD
UPDATE medications SET sale_currency = 'USD' WHERE id IN (17, 16, 8, 10, 15);

-- 2. Médicament avec purchase_currency = CDF -> sale_currency = CDF  
UPDATE medications SET sale_currency = 'CDF' WHERE id = 9;

-- 3. Médicaments avec prix élevé (> 100) et purchase_currency NULL -> USD
UPDATE medications 
SET sale_currency = 'USD', purchase_currency = 'USD' 
WHERE id IN (12, 11, 14);

-- 4. Médicaments avec prix bas (<= 100) et purchase_currency NULL -> CDF
UPDATE medications 
SET sale_currency = 'CDF', purchase_currency = 'CDF' 
WHERE id IN (13, 6, 5);

-- 5. Spécial: ID 7 (relax) a purchase_currency = CDF mais prix bas (2.00) -> CDF
UPDATE medications SET sale_currency = 'CDF' WHERE id = 7;

-- VÉRIFICATION
SELECT id, name, unit_price, sale_currency, purchase_currency
FROM medications
ORDER BY id;
