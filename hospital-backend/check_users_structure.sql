-- ══════════════════════════════════════════════════════════════════
-- VÉRIFICATION DE LA STRUCTURE DE LA TABLE USERS
-- ══════════════════════════════════════════════════════════════════

-- 1. Structure complète de la table users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Vérifier s'il y a déjà des utilisateurs
SELECT 
    'UTILISATEURS EXISTANTS' as info,
    id,
    username,
    email,
    created_at
FROM users 
ORDER BY id 
LIMIT 5;

-- 3. Vérifier les contraintes
SELECT 
    'CONTRAINTES' as info,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
  AND table_schema = 'public';
