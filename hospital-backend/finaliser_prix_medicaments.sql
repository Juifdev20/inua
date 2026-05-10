-- ══════════════════════════════════════════════════════════════════
-- FINALISATION COMPLÈTE DES PRIX DES MÉDICAMENTS
-- ══════════════════════════════════════════════════════════════════

-- 1. Ajouter la colonne 'price' (prix d'achat) si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medications' 
        AND column_name = 'price'
    ) THEN
        ALTER TABLE medications ADD COLUMN price DECIMAL(10,2) DEFAULT 500.00;
        RAISE NOTICE 'Colonne price ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne price existe déjà';
    END IF;
END $$;

-- 2. Mettre à jour tous les médicaments avec des valeurs par défaut
UPDATE medications 
SET 
    price = CASE 
        WHEN price IS NULL OR price = 0 THEN 500.00
        ELSE price
    END,
    unit_price = CASE 
        WHEN unit_price IS NULL OR unit_price = 0 THEN 800.00
        ELSE unit_price
    END
WHERE price IS NULL OR price = 0 OR unit_price IS NULL OR unit_price = 0;

-- 3. Vérifier le résultat
SELECT 
    'VÉRIFICATION FINALE' as info,
    id,
    name,
    price as prix_achat,
    unit_price as prix_vente,
    CASE 
        WHEN price IS NULL OR price = 0 THEN '❌ Prix achat manquant'
        WHEN unit_price IS NULL OR unit_price = 0 THEN '❌ Prix vente manquant'
        ELSE '✅ Prix complets'
    END as status,
    stock_quantity
FROM medications 
ORDER BY name;

-- 4. Statistiques
SELECT 
    'STATISTIQUES' as info,
    COUNT(*) as total_medicaments,
    COUNT(CASE WHEN price > 0 THEN 1 END) as avec_prix_achat,
    COUNT(CASE WHEN unit_price > 0 THEN 1 END) as avec_prix_vente,
    COUNT(CASE WHEN price > 0 AND unit_price > 0 THEN 1 END) as prix_complets
FROM medications;
