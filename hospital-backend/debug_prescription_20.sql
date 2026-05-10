-- ══════════════════════════════════════════════════════════════════
-- DEBUG PRESCRIPTION 20 - PROBLÈME RÉCURRENT
-- ══════════════════════════════════════════════════════════════════

-- 1. Vérifier les items de la prescription 20
SELECT 
    'ITEMS PRESCRIPTION 20' as info,
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
    (pi.quantity * COALESCE(m.unit_price, 0)) as calculated_from_medication_price
FROM prescription_items pi
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pi.prescription_id = 20;

-- 2. Mettre à jour TOUS les items sans prix (solution permanente)
UPDATE prescription_items pi
SET unit_price = (
    SELECT COALESCE(m.unit_price, 5000) 
    FROM medications m 
    WHERE m.id = pi.medication_id
)
WHERE pi.unit_price IS NULL OR pi.unit_price = 0;

-- 3. Mettre à jour tous les totaux
UPDATE prescription_items pi
SET total_price = pi.quantity * COALESCE(pi.unit_price, 0)
WHERE pi.total_price IS NULL OR pi.total_price = 0;

-- 4. Vérifier après mise à jour pour prescription 20
SELECT 
    'APRÈS MISE À JOUR PRESCRIPTION 20' as info,
    pi.id,
    pi.quantity,
    pi.unit_price,
    pi.total_price,
    m.name as medication_name,
    (pi.quantity * pi.unit_price) as verification_total
FROM prescription_items pi
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pi.prescription_id = 20;

-- 5. Compter combien d'items ont encore des problèmes
SELECT 
    'DÉCOMPTE FINAL DES PROBLÈMES' as info,
    COUNT(*) as items_sans_prix
FROM prescription_items pi
WHERE pi.unit_price IS NULL OR pi.unit_price = 0;
