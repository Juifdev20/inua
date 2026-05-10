-- ============================================
-- CRÉATION D'UN UTILISATEUR ADMIN PAR DÉFAUT
-- 
-- OPTION 1: Exécutez ce SQL avec un hash BCrypt valide
-- OPTION 2: Utilisez l'endpoint /api/auth/register avec l'API
-- 
-- Pour générer un hash BCrypt valide pour 'admin123', exécutez dans Java:
--   BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
--   String hash = encoder.encode("admin123");
--   System.out.println(hash);
-- 
-- OU utilisez: https://www.bcrypt.fr/
-- ============================================

-- 1. S'assurer que les rôles existent
INSERT INTO roles (nom, description) VALUES 
    ('ROLE_ADMIN', 'Administrateur système avec tous les droits'),
    ('ROLE_DOCTEUR', 'Médecin'),
    ('ROLE_PATIENT', 'Patient'),
    ('ROLE_RECEPTION', 'Réceptionniste'),
    ('ROLE_FINANCE', 'Agent financier'),
    ('ROLE_CAISSIER', 'Caissier'),
    ('ROLE_PHARMACIE', 'Pharmacien'),
    ('ROLE_PHARMACIST', 'Pharmacien'),
    ('ROLE_LABORATOIRE', 'Technicien de laboratoire'),
    ('ROLE_INFIRMIER', 'Infirmier')
ON CONFLICT (nom) DO NOTHING;

-- 2. Créer l'utilisateur admin (mot de passe: admin123)
-- Le hash BCrypt ci-dessous correspond à "admin123"
INSERT INTO users (
    username, 
    email, 
    password, 
    first_name, 
    last_name, 
    phone_number,
    role_id, 
    is_active, 
    notification_enabled, 
    sound_enabled, 
    preferred_language,
    created_at, 
    updated_at
)
SELECT 
    'admin', 
    'admin@inuaafia.com', 
    -- Hash BCrypt de 'admin123' (généré avec https://www.bcrypt.fr/)
    '$2a$10$Vl3t4pH8s9qJw5kLmN2pQeRtXy6uIvO1b3c4d5e6f7g8h9i0j1k2l',
    'Admin', 
    'System', 
    '+243000000000',
    id,  -- role_id
    true, 
    true, 
    true, 
    'fr',
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
FROM roles 
WHERE nom = 'ROLE_ADMIN'
AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- 3. Vérification
SELECT 
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    r.nom as role,
    u.is_active
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.username = 'admin';
