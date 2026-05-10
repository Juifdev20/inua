-- =====================================================
-- SCRIPT: Déboguer et corriger les devises des médicaments
-- =====================================================

-- 1. Vérifier les colonnes de la table medications
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'medications' 
ORDER BY ordinal_position;

-- 2. Vérifier les médicaments et leurs devises
SELECT id, name, unit_price, price, sale_currency, purchase_currency
FROM medications
ORDER BY id;

-- 3. Compter les médicaments par devise
SELECT 
    COALESCE(sale_currency, 'NULL') as devise,
    COUNT(*) as nombre_medicaments
FROM medications
GROUP BY sale_currency
ORDER BY devise;

-- 4. Mettre à jour les médicaments USD qui ont sale_currency à NULL
-- (à exécuter seulement si vous êtes sûr que ces médicaments sont en USD)
-- UPDATE medications 
-- SET sale_currency = 'USD'
-- WHERE sale_currency IS NULL 
-- AND (name LIKE '%USD%' OR unit_price > 100);  -- Adapter selon vos critères

-- 5. Vérifier les prescriptions et leurs items
SELECT 
    pi.id as item_id,
    pi.prescription_id,
    m.name as medication_name,
    m.unit_price,
    m.sale_currency,
    pi.quantity
FROM prescription_items pi
JOIN medications m ON pi.medication_id = m.id
ORDER BY pi.id DESC
LIMIT 20;

-- 6. Vérifier les factures pharmacie et leurs devises
SELECT 
    i.id,
    i.invoice_code,
    i.total_amount,
    i.currency,
    i.status,
    p.prescription_code
FROM invoices i
LEFT JOIN prescriptions p ON i.prescription_id = p.id
WHERE i.department_source = 'PHARMACY'
ORDER BY i.id DESC
LIMIT 10;
