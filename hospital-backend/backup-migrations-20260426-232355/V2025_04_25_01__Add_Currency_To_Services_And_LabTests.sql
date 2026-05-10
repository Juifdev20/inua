-- ============================================================================
-- Migration : Ajout des colonnes 'currency' pour la gestion multi-devises
-- Date : 2025-04-25
-- ============================================================================

-- 1. Ajouter la colonne 'currency' à la table medical_services
ALTER TABLE medical_services 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';

-- Commentaire explicatif
COMMENT ON COLUMN medical_services.currency IS 'Devise du service (USD ou CDF)';

-- 2. Ajouter la colonne 'currency' à la table lab_tests
ALTER TABLE lab_tests 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';

-- Commentaire explicatif
COMMENT ON COLUMN lab_tests.currency IS 'Devise du test de laboratoire (USD ou CDF)';

-- 3. Mettre à jour les services existants du département LABORATOIRE qui devraient être en USD
-- (Si vous avez des services spécifiques qui doivent être en CDF, modifiez cette requête)
UPDATE medical_services 
SET currency = 'USD' 
WHERE departement = 'LABORATOIRE' OR departement LIKE '%LAB%';

-- 4. Mettre à jour les lab_tests existants pour avoir la devise du service associé si possible
-- Par défaut, tous les tests existants seront en USD
UPDATE lab_tests 
SET currency = 'USD' 
WHERE currency IS NULL;

-- ============================================================================
-- Vérification : Afficher le nombre de lignes modifiées
-- ============================================================================
SELECT 
    'medical_services' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN currency = 'USD' THEN 1 END) as usd_count,
    COUNT(CASE WHEN currency = 'CDF' THEN 1 END) as cdf_count
FROM medical_services
UNION ALL
SELECT 
    'lab_tests' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN currency = 'USD' THEN 1 END) as usd_count,
    COUNT(CASE WHEN currency = 'CDF' THEN 1 END) as cdf_count
FROM lab_tests;
