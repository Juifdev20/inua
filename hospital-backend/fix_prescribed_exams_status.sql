-- ============================================================================
-- SCRIPT DE MISE À JOUR DE LA CONTRAINTE CHECK POUR prescribed_exams
-- ============================================================================
-- Ce script met à jour la contrainte CHECK de la table prescribed_exams
-- pour inclure tous les statuts définis dans l'Enum Java PrescribedExamStatus
-- ============================================================================

-- 1. Voir la contrainte actuelle (optionnel - pour diagnostic)
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'prescribed_exams'::regclass AND contype = 'c';

-- 2. Supprimer l'ancienne contrainte si elle existe
ALTER TABLE prescribed_exams DROP CONSTRAINT IF EXISTS prescribed_exams_status_check;
ALTER TABLE prescribed_exams DROP CONSTRAINT IF EXISTS chk_prescribed_exams_status;

-- 3. Créer la nouvelle contrainte avec tous les statuts de l'Enum Java PrescribedExamStatus
ALTER TABLE prescribed_exams ADD CONSTRAINT prescribed_exams_status_check 
CHECK (status IN (
    'PENDING',              -- En attente de traitement initial
    'PRESCRIBED',           -- Prescrit par le médecin
    'ADJUSTED_BY_CASHIER',  -- Modifié/validé par la caisse avant paiement
    'PAID',                 -- Payé à la caisse
    'PAID_PENDING_LAB',     -- Payé, en attente du laboratoire
    'IN_PROGRESS',          -- En cours au laboratoire
    'COMPLETED',            -- Terminé au laboratoire
    'RESULTS_AVAILABLE',    -- Résultats disponibles - prêts pour le médecin
    'DELIVERED_TO_DOCTOR',  -- Résultats remis au médecin
    'ARCHIVED',             -- Dossier archivé
    'CANCELLED'             -- Annulé / retiré
));

-- 4. Vérification (optionnel)
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'prescribed_exams'::regclass AND contype = 'c';

-- ============================================================================
-- COMMANDE À EXÉCUTER DANS PGADMIN OU PSQL:
-- \i fix_prescribed_exams_status.sql
-- ============================================================================
