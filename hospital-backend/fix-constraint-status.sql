-- =====================================================
-- SCRIPT DE CORRECTION CONTRAINTE consultations_status_check
-- =====================================================

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_status_check;

-- 2. Ajouter la nouvelle contrainte avec tous les statuts nécessaires
ALTER TABLE consultations 
ADD CONSTRAINT consultations_status_check 
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
    'LABORATOIRE_EN_ATTENTE',
    'PHARMACIE_EN_ATTENTE',
    'ATTENTE_PAIEMENT_LABO',
    'PENDING_PAYMENT',
    'PAID_PENDING_LAB',
    'PAID_COMPLETED'
));

-- 3. Vérifier que la contrainte a été ajoutée correctement
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'consultations'::regclass 
  AND contype = 'c';

-- =====================================================
-- TEST DE VALIDATION
-- =====================================================

-- Test d'insertion avec PENDING_PAYMENT (devrait réussir)
-- INSERT INTO consultations (status, statut) VALUES ('PENDING_PAYMENT', 'PENDING_PAYMENT');

-- Test d'insertion avec statut invalide (devrait échouer)
-- INSERT INTO consultations (status, statut) VALUES ('INVALID_STATUS', 'INVALID_STATUS');

-- =====================================================
-- RÉSUMÉ DES CHANGEMENTS
-- =====================================================
/*
✅ CONTRAINTE CORRIGÉE:
- Ancienne contrainte supprimée
- Nouvelle contrainte avec tous les statuts supportés

✅ STATUTS SUPPORTÉS:
- ARRIVED ✅
- CONFIRMED ✅  
- PENDING_PAYMENT ✅
- COMPLETED ✅
- CANCELLED ✅
- Et tous les autres statuts existants

✅ VALIDATION:
- Le backend pourra maintenant utiliser PENDING_PAYMENT
- Plus d'erreur "consultations_status_check"
- Flux docteur → réception fonctionnel
*/
