-- ============================================================
-- ROLLBACK: Supprimer la colonne hospital_id de hospital_config
-- ============================================================
-- Ce script annule les changements si le serveur coupe
-- ============================================================

-- 1. Supprimer la contrainte de clé étrangère
ALTER TABLE hospital_config 
DROP CONSTRAINT IF EXISTS fk_hospital_config_hospital;

-- 2. Supprimer l'index
DROP INDEX IF EXISTS idx_hospital_config_hospital_id;

-- 3. Supprimer la colonne hospital_id
ALTER TABLE hospital_config 
DROP COLUMN IF EXISTS hospital_id;

-- Vérification
SELECT 
    hc.id,
    hc.hospital_name,
    hc.hospital_code
FROM hospital_config hc
ORDER BY hc.id;
