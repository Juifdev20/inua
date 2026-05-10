-- =====================================================
-- SCRIPT: Ajouter les colonnes currency pour les examens
-- =====================================================

-- 1. Ajouter la colonne currency à medical_services
ALTER TABLE medical_services 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

-- 2. Mettre à jour les services existants avec CDF par défaut
UPDATE medical_services 
SET currency = 'CDF' 
WHERE currency IS NULL;

-- 3. Ajouter la colonne currency à prescribed_exams
ALTER TABLE prescribed_exams 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

-- 4. Mettre à jour les examens existants avec CDF par défaut
UPDATE prescribed_exams 
SET currency = 'CDF' 
WHERE currency IS NULL;

-- 5. Vérification
SELECT 'medical_services' as table_name, COUNT(*) as total, 
       COUNT(CASE WHEN currency = 'USD' THEN 1 END) as usd_count,
       COUNT(CASE WHEN currency = 'CDF' THEN 1 END) as cdf_count
FROM medical_services
UNION ALL
SELECT 'prescribed_exams' as table_name, COUNT(*) as total,
       COUNT(CASE WHEN currency = 'USD' THEN 1 END) as usd_count,
       COUNT(CASE WHEN currency = 'CDF' THEN 1 END) as cdf_count
FROM prescribed_exams;
