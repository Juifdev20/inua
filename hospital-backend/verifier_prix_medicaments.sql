-- ══════════════════════════════════════════════════════════════════
-- VÉRIFICATION DES PRIX DES MÉDICAMENTS (DICLO ET AUTRES)
-- ══════════════════════════════════════════════════════════════════

-- 1. Vérifier les médicaments avec "diclo" dans le nom
SELECT 
    'MÉDICAMENTS DICLO' as info,
    id,
    name,
    unit_price,
    stock_quantity
FROM medications 
WHERE name ILIKE '%diclo%'
ORDER BY name;

-- 2. Vérifier tous les médicaments avec leurs prix
SELECT 
    'TOUS LES MÉDICAMENTS AVEC PRIX' as info,
    id,
    name,
    unit_price,
    CASE 
        WHEN unit_price IS NULL THEN '❌ PRIX NULL'
        WHEN unit_price = 0 THEN '❌ PRIX ZÉRO'
        WHEN unit_price > 0 THEN '✅ PRIX OK'
    END as status_prix,
    stock_quantity
FROM medications 
ORDER BY 
    CASE 
        WHEN unit_price IS NULL OR unit_price = 0 THEN 1
        ELSE 0
    END,
    name;

-- 3. Vérifier la prescription 20 avec jointure complète
SELECT 
    'PRESCRIPTION 20 - DÉTAIL COMPLET' as info,
    pi.id as item_id,
    pi.quantity,
    pi.unit_price as prix_dans_item,
    m.id as med_id,
    m.name as med_name,
    m.unit_price as prix_dans_medication,
    CASE 
        WHEN m.unit_price IS NULL THEN '❌ médicament sans prix'
        WHEN m.unit_price = 0 THEN '❌ médicament prix = 0'
        ELSE '✅ médicament avec prix: ' || m.unit_price
    END as status,
    (pi.quantity * COALESCE(m.unit_price, 0)) as calcul_total
FROM prescription_items pi
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pi.prescription_id = 20;
