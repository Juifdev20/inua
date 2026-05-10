-- ============================================
-- 🚀 MIGRATION PostgreSQL : Automatisation des Comptes Utilisateurs (Inua Afia)
-- Date : 2024
-- ============================================

-- 1. Ajouter la colonne must_change_password à la table users
-- Cette colonne indique si l'utilisateur doit changer son mot de passe
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;

-- Mettre à jour les utilisateurs existants pour ne pas forcer le changement
-- (seuls les nouveaux comptes devront changer leur mot de passe)
UPDATE users 
SET must_change_password = FALSE 
WHERE must_change_password IS NULL;

-- 2. Rendre l'email nullable pour supporter les patients sans email
-- PostgreSQL : utiliser DROP NOT NULL
ALTER TABLE users 
ALTER COLUMN email DROP NOT NULL;

-- 3. Créer un index sur username pour accélérer la vérification d'unicité
-- Note: PostgreSQL 9.5+ supporte IF NOT EXISTS pour CREATE INDEX
-- Si l'index existe déjà, cette commande ne fera rien
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 4. Optionnel : Créer un index sur must_change_password pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_users_must_change ON users(must_change_password);

-- ============================================
-- 🔍 VÉRIFICATION
-- ============================================

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users';

-- Vérifier les données (doit montrer must_change_password = FALSE pour tous les users existants)
SELECT id, username, email, must_change_password 
FROM users 
LIMIT 10;

-- ============================================
-- ⚠️ NOTES IMPORTANTES PostgreSQL
-- ============================================

-- Si vous avez une erreur sur la modification de la colonne email,
-- c'est peut-être à cause d'une contrainte d'unicité. Dans ce cas :

-- 1. Vérifier les contraintes existantes
-- SELECT conname, contype, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'users'::regclass;

-- 2. Si nécessaire, supprimer temporairement la contrainte d'unicité sur email
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS uk_email;

-- 3. Modifier la colonne (déjà fait ci-dessus avec ALTER COLUMN email DROP NOT NULL)

-- 4. Recréer l'index (sans contrainte d'unicité stricte pour NULL)
-- CREATE UNIQUE INDEX idx_email_not_null ON users(email) WHERE email IS NOT NULL;

-- ============================================
-- 📝 ROLLBACK (en cas de problème)
-- ============================================

-- Si vous devez annuler la migration :

-- Supprimer la colonne
-- ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;

-- Remettre email comme NOT NULL (attention aux données existantes !)
-- UPDATE users SET email = CONCAT('user_', id, '@inuaafia.local') WHERE email IS NULL;
-- ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- ============================================
-- ✅ VÉRIFICATION FINALE
-- ============================================

-- Compter les utilisateurs par statut must_change_password
SELECT 
    must_change_password, 
    COUNT(*) as count 
FROM users 
GROUP BY must_change_password;

-- Résultat attendu :
-- must_change_password | count
-- FALSE                | N (tous les users existants)
-- TRUE                 | 0 (ou nouveaux comptes créés après migration)
