-- ============================================================================
-- Migration : Ajout de la colonne 'currency' à prescribed_exams
-- Date : 2025-04-25
-- ============================================================================

-- 1. Ajouter la colonne 'currency' à la table prescribed_exams
ALTER TABLE prescribed_exams 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

-- Commentaire explicatif
COMMENT ON COLUMN prescribed_exams.currency IS 'Devise de l examen prescrit (USD ou CDF) - copiee depuis medical_services';

-- 2. Vérifier si medical_services a la colonne currency avant de copier
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'medical_services' 
        AND column_name = 'currency'
    ) THEN
        -- Mettre à jour les examens prescrits existants avec la devise du service associé
        UPDATE prescribed_exams pe
        SET currency = (
            SELECT ms.currency 
            FROM medical_services ms 
            WHERE ms.id = pe.service_id
        )
        WHERE pe.service_id IS NOT NULL 
          AND pe.currency IS NULL;
    END IF;
END $$;

-- 3. Pour les examens sans devise, mettre USD par défaut
UPDATE prescribed_exams 
SET currency = 'USD' 
WHERE currency IS NULL;

-- 4. Rendre la colonne NOT NULL après mise à jour
ALTER TABLE prescribed_exams 
ALTER COLUMN currency SET NOT NULL;

-- ============================================================================
-- Vérification : Afficher le nombre de lignes modifiées
-- ============================================================================
SELECT 
    'prescribed_exams' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN currency = 'USD' THEN 1 END) as usd_count,
    COUNT(CASE WHEN currency = 'CDF' THEN 1 END) as cdf_count
FROM prescribed_exams;
