-- ============================================================
-- AJOUT DE LA COLONNE hospital_id DANS hospital_config
-- ============================================================
-- Ce script corrige l'erreur: column hc1_0.hospital_id does not exist
-- ============================================================

-- 1. Ajouter la colonne hospital_id (nullable pour compatibilité avec les données existantes)
ALTER TABLE hospital_config 
ADD COLUMN IF NOT EXISTS hospital_id BIGINT;

-- 2. Ajouter la contrainte de clé étrangère vers la table hospitals
-- PostgreSQL ne supporte pas IF NOT EXISTS pour ADD CONSTRAINT, donc on vérifie d'abord
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_hospital_config_hospital'
    ) THEN
        ALTER TABLE hospital_config 
        ADD CONSTRAINT fk_hospital_config_hospital 
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Pour les configurations existantes, les associer à l'hôpital principal (id=1)
UPDATE hospital_config 
SET hospital_id = 1 
WHERE hospital_id IS NULL;

-- 4. Rendre la colonne NOT NULL après la migration (optionnel, si toutes les lignes ont un hospital_id)
-- ALTER TABLE hospital_config ALTER COLUMN hospital_id SET NOT NULL;

-- 5. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_hospital_config_hospital_id ON hospital_config(hospital_id);

-- Vérification
SELECT 
    hc.id,
    hc.hospital_name,
    hc.hospital_code,
    hc.hospital_id,
    h.nom as hospital_nom
FROM hospital_config hc
LEFT JOIN hospitals h ON hc.hospital_id = h.id
ORDER BY hc.id;
