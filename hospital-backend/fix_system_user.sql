-- ══════════════════════════════════════════════════════════════════
-- CRÉATION DE L'UTILISATEUR SYSTÈME (ID 1)
-- ══════════════════════════════════════════════════════════════════

-- Vérifier si l'utilisateur système existe
SELECT id, username, email, role_id FROM users WHERE id = 1;

-- Créer l'utilisateur système s'il n'existe pas
INSERT INTO users (id, username, email, password, first_name, last_name, created_at, is_active, role_id)
VALUES (
    1, 
    'system', 
    'system@hospital.com', 
    '$2a$10$dummy.hash.for.system.user', 
    'System', 
    'User', 
    NOW(), 
    true,
    1  -- role_id (supposons que 1 = ADMIN)
) ON CONFLICT (id) DO UPDATE SET
    username = 'system',
    email = 'system@hospital.com',
    is_active = true,
    role_id = 1;

-- Vérifier la création
SELECT id, username, email, role_id FROM users WHERE id = 1;
