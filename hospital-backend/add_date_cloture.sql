-- ============================================
-- MIGRATION : Ajout de la date de clôture
-- ============================================
-- Cette migration ajoute le champ date_cloture à la table consultations
-- pour suivre quand le docteur finalise une consultation
-- ============================================

-- Vérifier si la colonne existe déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'consultations' 
        AND column_name = 'date_cloture'
    ) THEN
        -- Ajouter la colonne date_cloture
        ALTER TABLE consultations 
        ADD COLUMN date_cloture TIMESTAMP NULL;
        
        RAISE NOTICE '✅ Colonne date_cloture ajoutée avec succès';
    ELSE
        RAISE NOTICE '⚠️ La colonne date_cloture existe déjà';
    END IF;
END $$;

-- Vérifier la structure actuelle
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'consultations' 
AND column_name IN ('consultation_date', 'created_at', 'updated_at', 'date_cloture')
ORDER BY ordinal_position;
