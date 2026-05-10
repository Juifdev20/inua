-- ══════════════════════════════════════════════════════════════════
-- VÉRIFICATION DES COLONNES FINANCIÈRES
-- ══════════════════════════════════════════════════════════════════

-- 1. Vérifier si la colonne 'price' existe
SELECT 
    'VÉRIFICATION COLONNES' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'medications' 
  AND column_name IN ('price', 'unit_price')
ORDER BY column_name;

-- 2. Vérifier les données actuelles
SELECT 
    'DONNÉES ACTUELLES' as info,
    id,
    name,
    price,
    unit_price,
    stock_quantity,
    CASE 
        WHEN price IS NULL THEN '❌ price NULL'
        WHEN unit_price IS NULL THEN '❌ unit_price NULL'
        WHEN price = 0 THEN '❌ price = 0'
        WHEN unit_price = 0 THEN '❌ unit_price = 0'
        ELSE '✅ Prix OK'
    END as status
FROM medications 
ORDER BY name
LIMIT 10;

-- 3. Compter les médicaments avec des prix
SELECT 
    'STATISTIQUES PRIX' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN price > 0 THEN 1 END) as avec_price,
    COUNT(CASE WHEN unit_price > 0 THEN 1 END) as avec_unit_price
FROM medications;
