-- ══════════════════════════════════════════════════════════════════
-- AJOUTER LA COLONNE PRICE MANQUANTE
-- ══════════════════════════════════════════════════════════════════

-- 1. Ajouter la colonne 'price' si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medications' 
        AND column_name = 'price'
    ) THEN
        ALTER TABLE medications ADD COLUMN price DECIMAL(10,2) DEFAULT 500.00;
        RAISE NOTICE '✅ Colonne price ajoutée avec succès';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne price existe déjà';
    END IF;
END $$;

-- 2. Mettre à jour les médicaments sans prix d'achat
UPDATE medications 
SET price = 500.00 
WHERE price IS NULL OR price = 0;

-- 3. Vérifier le résultat
SELECT 
    'VÉRIFICATION FINALE' as info,
    id,
    name,
    price as prix_achat,
    unit_price as prix_vente,
    stock_quantity,
    CASE 
        WHEN price IS NULL OR price = 0 THEN '❌ Prix achat manquant'
        WHEN unit_price IS NULL OR unit_price = 0 THEN '❌ Prix vente manquant'
        ELSE '✅ Prix complets'
    END as status
FROM medications 
ORDER BY name
LIMIT 10;
