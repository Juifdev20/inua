-- Ajouter les colonnes de devise pour les prix d'achat et de vente
-- Date: 2025-04-20

-- Vérifier si les colonnes existent déjà
DO $$
BEGIN
    -- Ajouter purchase_currency si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'medications' AND column_name = 'purchase_currency'
    ) THEN
        ALTER TABLE medications ADD COLUMN purchase_currency VARCHAR(3);
        RAISE NOTICE 'Colonne purchase_currency ajoutée';
    ELSE
        RAISE NOTICE 'Colonne purchase_currency existe déjà';
    END IF;

    -- Ajouter sale_currency si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'medications' AND column_name = 'sale_currency'
    ) THEN
        ALTER TABLE medications ADD COLUMN sale_currency VARCHAR(3);
        RAISE NOTICE 'Colonne sale_currency ajoutée';
    ELSE
        RAISE NOTICE 'Colonne sale_currency existe déjà';
    END IF;
END $$;

-- Migrer les données existantes (si devise existe déjà)
-- Si vous avez une ancienne colonne 'devise', copier sa valeur vers purchase_currency
UPDATE medications
SET purchase_currency = 'CDF'
WHERE purchase_currency IS NULL;

UPDATE medications
SET sale_currency = purchase_currency
WHERE sale_currency IS NULL;

-- Vérification
SELECT 
    id, 
    name, 
    price,
    purchase_currency,
    unit_price,
    sale_currency
FROM medications 
LIMIT 5;
