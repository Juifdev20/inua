-- ============================================================
-- CREATION SUPER ADMIN EN PRODUCTION
-- ============================================================
-- A executer dans le SQL Editor de Supabase (ou pgAdmin)
--
-- IMPORTANT : Le hash bcrypt ci-dessous correspond au mot de passe :
--    SuperAdmin2024!
--
-- Pour generer un autre hash bcrypt, utilisez :
--    - https://bcrypt-generator.com/
--    - Ou l'API Spring Boot : POST /api/auth/hash { "password": "votreMotDePasse" }
-- ============================================================

-- 1. Creer le role SUPERADMIN s'il n'existe pas
INSERT INTO roles (nom, description)
SELECT 'ROLE_SUPERADMIN', 'Administrateur technique du systeme - acces complet a la gouvernance et a la securite'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nom = 'ROLE_SUPERADMIN');

-- 2. Verifier que l'hopital par defaut existe (hospital_id = 1)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM hospitals WHERE id = 1) THEN
        INSERT INTO hospitals (id, nom, code, is_active, subscription_plan, max_users, created_at, updated_at)
        VALUES (1, 'Hopital Principal', 'MAIN', true, 'STANDARD', 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    END IF;
END $$;

-- 3. Creer le super admin
--    Remplacez les valeurs ci-dessous par celles souhaitees :
--    - username     : nom d'utilisateur
--    - email        : email
--    - first_name   : prenom
--    - last_name    : nom
--    - password     : hash bcrypt (ci-dessous = SuperAdmin2024!)

INSERT INTO users (
    username,
    email,
    password,
    first_name,
    last_name,
    phone_number,
    role_id,
    hospital_id,
    is_active,
    notification_enabled,
    sound_enabled,
    preferred_language,
    created_at,
    updated_at
)
SELECT
    'superadmin',                                    -- MODIFIABLE : nom d'utilisateur
    'superadmin@votredomaine.com',                   -- MODIFIABLE : email
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- hash de "SuperAdmin2024!"
    'Super',                                         -- MODIFIABLE : prenom
    'Administrateur',                                -- MODIFIABLE : nom
    '+243000000000',                                 -- MODIFIABLE : telephone
    (SELECT id FROM roles WHERE nom = 'ROLE_SUPERADMIN'),
    1,                                               -- hospital_id (1 = hopital par defaut)
    true,
    true,
    true,
    'fr',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'superadmin');

-- 4. Verifier la creation
SELECT 
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    r.nom AS role,
    u.is_active,
    u.hospital_id
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.username = 'superadmin';
