-- ══════════════════════════════════════════════════════════════════
-- DEBUG PRESCRIPTION 19 - POURQUOI MONTANT = 0 ?
-- ══════════════════════════════════════════════════════════════════

-- 1. Vérifier les items de la prescription 19
SELECT 
    'ITEMS PRESCRIPTION 19' as info,
    pi.id as item_id,
    pi.quantity,
    pi.unit_price as item_unit_price,
    pi.total_price as item_total_price,
    m.id as medication_id,
    m.name as medication_name,
    m.unit_price as medication_unit_price,
    CASE 
        WHEN pi.unit_price IS NULL THEN '❌ prix item NULL'
        WHEN pi.unit_price = 0 THEN '❌ prix item = 0'
        ELSE '✅ prix item OK'
    END as item_price_status,
    CASE 
        WHEN m.unit_price IS NULL THEN '❌ prix médicament NULL'
        WHEN m.unit_price = 0 THEN '❌ prix médicament = 0'
        ELSE '✅ prix médicament OK'
    END as medication_price_status,
    (pi.quantity * COALESCE(pi.unit_price, 0)) as calculated_from_item_price,
    (pi.quantity * COALESCE(m.unit_price, 0)) as calculated_from_medication_price
FROM prescription_items pi
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pi.prescription_id = 19;

-- 2. Vérifier le calcul que fait le code Java
SELECT 
    'CALCUL JAVA SIMULATION' as info,
    SUM(pi.quantity * COALESCE(m.unit_price, 0)) as java_calculation,
    COUNT(pi.id) as nombre_items
FROM prescription_items pi
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pi.prescription_id = 19;

-- 3. Mettre à jour les prix dans prescription_items si nécessaire
UPDATE prescription_items pi
SET unit_price = (
    SELECT m.unit_price 
    FROM medications m 
    WHERE m.id = pi.medication_id
)
WHERE pi.prescription_id = 19 
  AND pi.unit_price IS NULL;

-- 4. Mettre à jour les totaux
UPDATE prescription_items pi
SET total_price = pi.quantity * COALESCE(pi.unit_price, 0)
WHERE pi.prescription_id = 19;

-- 5. Vérifier après mise à jour
SELECT 
    'APRÈS MISE À JOUR' as info,
    pi.id,
    pi.quantity,
    pi.unit_price,
    pi.total_price,
    m.name as medication_name
FROM prescription_items pi
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pi.prescription_id = 19;
