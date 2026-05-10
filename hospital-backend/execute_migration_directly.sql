-- Migration V3: Ajouter registration_fee et service_fee à la table admissions
-- Exécuter ce script directement sur votre base de données PostgreSQL

-- 1. Ajouter les colonnes si elles n'existent pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admissions' AND column_name = 'registration_fee'
    ) THEN
        ALTER TABLE admissions ADD COLUMN registration_fee NUMERIC(19,2) DEFAULT 0.0;
        RAISE NOTICE 'Colonne registration_fee ajoutée';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admissions' AND column_name = 'service_fee'
    ) THEN
        ALTER TABLE admissions ADD COLUMN service_fee NUMERIC(19,2) DEFAULT 0.0;
        RAISE NOTICE 'Colonne service_fee ajoutée';
    END IF;
END $$;

-- 2. Migrer les données existantes
-- Pour les admissions existantes, on suppose que total_amount était déjà le montant total
-- On met registration_fee = 0 pour les anciens admissions (on ne peut pas savoir si c'était la première fois)
UPDATE admissions 
SET 
    registration_fee = 0.0,
    service_fee = COALESCE(total_amount, 0.0)
WHERE registration_fee IS NULL OR service_fee IS NULL;

-- 3. Vérifier le résultat
SELECT 
    id, 
    patient_id, 
    registration_fee, 
    service_fee, 
    total_amount, 
    amount_paid,
    created_at
FROM admissions 
ORDER BY created_at DESC 
LIMIT 10;
