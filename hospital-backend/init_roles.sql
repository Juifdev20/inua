-- ============================================
-- INITIALISATION DES RÔLES ESSENTIELS
-- À exécuter sur la base PostgreSQL Render
-- ============================================

-- Insérer les rôles si ils n'existent pas
INSERT INTO roles (nom, description) VALUES 
    ('ROLE_ADMIN', 'Administrateur système'),
    ('ROLE_DOCTEUR', 'Médecin'),
    ('ROLE_PATIENT', 'Patient'),
    ('ROLE_RECEPTION', 'Réceptionniste'),
    ('ROLE_FINANCE', 'Agent financier'),
    ('ROLE_CAISSIER', 'Caissier'),
    ('ROLE_PHARMACIE', 'Pharmacien'),
    ('ROLE_PHARMACIST', 'Pharmacien (anglais)'),
    ('ROLE_LABORATOIRE', 'Technicien de laboratoire'),
    ('ROLE_INFIRMIER', 'Infirmier')
ON CONFLICT (nom) DO NOTHING;

-- Vérification
SELECT * FROM roles;
