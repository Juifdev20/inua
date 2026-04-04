-- =====================================================
-- SCRIPT DE CORRECTION CONTRAINTE prescriptions_status_check
-- =====================================================

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_status_check;

-- 2. Ajouter la nouvelle contrainte avec tous les statuts nécessaires
ALTER TABLE prescriptions 
ADD CONSTRAINT prescriptions_status_check 
CHECK (status IN (
    'EN_ATTENTE',
    'PRESCRIPTION_ENVOYEE',
    'VALIDEE',
    'PAYEE',
    'DELIVREE',
    'PARTIELLEMENT_DELIVREE',
    'ANNULEE'
));

-- 3. Vérifier que la contrainte a été ajoutée correctement
SELECT conname, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint 
WHERE conrelid = 'prescriptions'::regclass 
  AND contype = 'c';

-- =====================================================
-- RÉSUMÉ DES CHANGEMENTS
-- =====================================================
/*
✅ CONTRAINTE CORRIGÉE:
- Ancienne contrainte supprimée
- Nouvelle contrainte avec tous les statuts supportés

✅ STATUTS SUPPORTÉS:
- EN_ATTENTE
- PRESCRIPTION_ENVOYEE
- VALIDEE
- PAYEE (AJOUTÉ)
- DELIVREE
- PARTIELLEMENT_DELIVREE
- ANNULEE

✅ VALIDATION:
- Le paiement de la finance pourra maintenant mettre à jour le statut PAYEE
- Plus d'erreur "prescriptions_status_check"
- Flux pharmacie → caisse → paiement fonctionnel
*/
