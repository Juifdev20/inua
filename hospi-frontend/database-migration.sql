-- Migration SQL pour la production
-- Ajout de la colonne beneficiary_name à la table abonnement
-- Date: 2026-06-02

-- Vérifier si la colonne existe déjà avant de l'ajouter
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'abonnement' 
        AND column_name = 'beneficiary_name'
    ) THEN
        -- Ajouter la colonne beneficiary_name
        ALTER TABLE abonnement 
        ADD COLUMN beneficiary_name VARCHAR(255);
        
        RAISE NOTICE 'Colonne beneficiary_name ajoutée avec succès à la table abonnement';
    ELSE
        RAISE NOTICE 'La colonne beneficiary_name existe déjà dans la table abonnement';
    END IF;
END $$;

-- Pour les bases de données qui ne supportent pas les blocs PL/pgSQL
-- Alternative simple (avec risque d'erreur si la colonne existe déjà):
-- ALTER TABLE abonnement ADD COLUMN beneficiary_name VARCHAR(255);

-- Confirmation de la migration
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'abonnement' 
AND column_name = 'beneficiary_name';
