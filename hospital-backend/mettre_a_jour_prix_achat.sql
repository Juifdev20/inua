-- ══════════════════════════════════════════════════════════════════
-- METTRE À JOUR LES PRIX D'ACHAT MANQUANTS
-- ══════════════════════════════════════════════════════════════════

-- Mettre à jour tous les médicaments qui n'ont pas de prix d'achat
UPDATE medications 
SET price = CASE 
    WHEN unit_price IS NOT NULL AND unit_price > 0 THEN ROUND(unit_price * 0.6, 2)  -- 60% du prix de vente
    ELSE 500.00  -- Prix par défaut
END
WHERE price IS NULL OR price = 0;

-- Vérifier le résultat
SELECT 
    id,
    name,
    medicationCode,
    price as prix_achat,
    unit_price as prix_vente,
    stock_quantity,
    (price * stock_quantity) as investissement_total,
    ((unit_price - price) * stock_quantity) as benefice_total
FROM medications 
ORDER BY name;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Prix d''achat mis à jour pour tous les médicaments !';
    RAISE NOTICE '💡 Les prix d''achat ont été calculés à 60%% des prix de vente';
END $$;
