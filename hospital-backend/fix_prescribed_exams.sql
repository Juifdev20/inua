-- ═══════════════════════════════════════════════════════════════════
-- SCRIPT DE MIGRATION : Rendre service_id et service_name NULLABLE
-- 
-- ⚠️ A LIRE AVANT D'EXECUTER :
-- Ce script est SÛR et ne supprime AUCUNE donnée existante.
-- Il modifie uniquement les contraintes de la table.
--
-- INSTRUCTIONS :
-- 1. Ouvrez pgAdmin ou psql
-- 2. Connectez-vous à la base hospital_db
-- 3. Exécutez ce script
-- 4. Redémarrez le backend Spring Boot
-- ═══════════════════════════════════════════════════════════════════

-- Supprimer la contrainte NOT NULL sur service_id
ALTER TABLE prescribed_exams ALTER COLUMN service_id DROP NOT NULL;

-- Supprimer la contrainte NOT NULL sur service_name
ALTER TABLE prescribed_exams ALTER COLUMN service_name DROP NOT NULL;

-- Vérification (optionnel, pour confirmer)
-- SELECT column_name, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'prescribed_exams' 
-- AND column_name IN ('service_id', 'service_name');
