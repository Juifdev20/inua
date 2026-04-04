-- Ajouter le statut RESULTATS_PRETS à la contrainte check de la table consultations

-- 1. D'abord, voir la contrainte actuelle
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'consultations'::regclass;

-- 2. Supprimer l'ancienne contrainte
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_status_check;

-- 3. Créer la nouvelle contrainte avec RESULTATS_PRETS
ALTER TABLE consultations ADD CONSTRAINT consultations_status_check 
CHECK (status IN (
    'EN_ATTENTE',
    'CONFIRME',
    'CONFIRMED',
    'EN_COURS',
    'TERMINE',
    'COMPLETED',
    'ANNULE',
    'CANCELLED',
    'ARCHIVED',
    'ARRIVED',
    -- Ancien workflow
    'LABORATOIRE_EN_ATTENTE',
    'PHARMACIE_EN_ATTENTE',
    'ATTENTE_PAIEMENT_LABO',
    'PENDING_PAYMENT',
    'PAID_PENDING_LAB',
    'PAID_COMPLETED',
    'PAYEE',
    -- Nouveau workflow examens
    'EXAMENS_PRESCRITS',
    'EXAMENS_PAYES',
    'AU_LABO',
    'RESULTATS_PRETS'  -- ← Nouveau statut ajouté
));

-- 4. Vérifier la contrainte
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'consultations'::regclass;
