-- ============================================================
-- SCRIPT DE REPARATION FLYWAY
-- Usage: Executer dans pgAdmin ou psql sur la base hospital_db
-- ============================================================

-- Ce script reinitialise l'historique Flyway pour la version 2
-- sans toucher aux donnees existantes.
-- ============================================================

-- 1. Verifier si la table flyway_schema_history existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'flyway_schema_history'
    ) THEN
        RAISE NOTICE 'Table flyway_schema_history inexistante - Flyway va la creer automatiquement';
        RETURN;
    END IF;
END $$;

-- 2. Supprimer la ligne de la migration V2 (pour la reappliquer proprement)
DELETE FROM flyway_schema_history 
WHERE version = '2';

-- 3. Verifier le resultat
SELECT 
    version,
    description,
    type,
    script,
    checksum,
    installed_on,
    success
FROM flyway_schema_history 
ORDER BY installed_rank;

-- 4. Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Reparation terminee. Redemarrez l application Spring Boot.';
    RAISE NOTICE 'Flyway va reappliquer la migration V2 avec le nouveau contenu.';
END $$;
