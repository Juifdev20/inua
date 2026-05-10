-- ══════════════════════════════════════════════════════════════════
-- VÉRIFICATION DES PRIX DES MÉDICAMENTS
-- ══════════════════════════════════════════════════════════════════

-- 1. Vérifier les médicaments de la prescription 17 avec leurs prix
SELECT 
    'MÉDICAMENTS PRESCRIPTION 17' as info,
    pi.id as item_id,
    pi.quantity,
    m.id as medication_id,
    m.name as medication_name,
    m.unit_price,
    CASE 
        WHEN m.unit_price IS NULL THEN '❌ PRIX NULL'
        WHEN m.unit_price = 0 THEN '❌ PRIX ZÉRO'
        ELSE '✅ PRIX OK'
    END as prix_status,
    (pi.quantity * COALESCE(m.unit_price, 0)) as total_item
FROM prescription_items pi
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pi.prescription_id = 17;

-- 2. Vérifier tous les médicaments sans prix
SELECT 
    'MÉDICAMENTS SANS PRIX' as info,
    id,
    name,
    unit_price,
    stock_quantity
FROM medications 
WHERE unit_price IS NULL OR unit_price = 0
ORDER BY name;

-- 3. Mettre à jour les prix des médicaments (exemple)
UPDATE medications 
SET unit_price = 5000 
WHERE unit_price IS NULL OR unit_price = 0;

-- 4. Vérifier la mise à jour
SELECT 
    'VÉRIFICATION APRÈS MISE À JOUR' as info,
    id,
    name,
    unit_price,
    stock_quantity
FROM medications 
ORDER BY name;
