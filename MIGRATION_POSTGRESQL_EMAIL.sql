-- ============================================
-- ★ MIGRATION POSTGRESQL - Email & Réinitialisation MDP
-- Pour pgAdmin / PostgreSQL
-- ============================================

-- ============================================
-- 1. TABLE DES TOKENS DE RÉINITIALISATION
-- ============================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_expiry ON password_reset_tokens(expiry_date);

-- Clé étrangère
ALTER TABLE password_reset_tokens
    DROP CONSTRAINT IF EXISTS fk_password_reset_user;
    
ALTER TABLE password_reset_tokens
    ADD CONSTRAINT fk_password_reset_user
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

-- Commentaires sur la table
COMMENT ON TABLE password_reset_tokens IS 'Tokens de réinitialisation de mot de passe (24h validité)';
COMMENT ON COLUMN password_reset_tokens.user_id IS 'ID de l utilisateur concerné';
COMMENT ON COLUMN password_reset_tokens.token IS 'Token unique de réinitialisation (UUID)';
COMMENT ON COLUMN password_reset_tokens.expiry_date IS 'Date d expiration du token (24h après création)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Indique si le token a déjà été utilisé';

-- ============================================
-- 2. VÉRIFICATION/CORRECTION TABLE USERS
-- ============================================

-- Vérifier si la colonne must_change_password existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'must_change_password'
    ) THEN
        ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Colonne must_change_password ajoutée';
    ELSE
        RAISE NOTICE 'Colonne must_change_password existe déjà';
    END IF;
END $$;

-- Vérifier si la colonne email est nullable
DO $$
BEGIN
    -- Rendre email nullable s'il ne l'est pas déjà
    ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    RAISE NOTICE 'Colonne email rendue nullable';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Email est déjà nullable ou autre erreur: %', SQLERRM;
END $$;

-- ============================================
-- 3. MISE À JOUR DES UTILISATEURS EXISTANTS
-- ============================================

-- Les utilisateurs existants n'ont pas besoin de changer leur MDP
UPDATE users 
SET must_change_password = FALSE 
WHERE must_change_password IS NULL 
   OR must_change_password = TRUE;

-- ============================================
-- 4. FONCTION DE NETTOYAGE (optionnel)
-- ============================================

-- Créer une fonction pour nettoyer les tokens expirés
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_reset_tokens 
    WHERE expiry_date < NOW() 
       OR used = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_tokens() IS 'Supprime les tokens de réinitialisation expirés ou utilisés';

-- ============================================
-- 5. VÉRIFICATIONS FINALES
-- ============================================

-- Vérifier la structure de la table password_reset_tokens
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'password_reset_tokens'
ORDER BY ordinal_position;

-- Vérifier la structure de la table users (colonnes importantes)
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('id', 'email', 'must_change_password', 'password')
ORDER BY ordinal_position;

-- Compter les tokens existants (devrait être 0)
SELECT COUNT(*) as total_tokens FROM password_reset_tokens;

-- Vérifier les contraintes de clé étrangère
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'password_reset_tokens';

-- ============================================
-- 6. INSERTION DE TEST (optionnel - à supprimer après test)
-- ============================================

-- Décommenter pour tester (remplacer 1 par un vrai user_id):
-- INSERT INTO password_reset_tokens (user_id, token, expiry_date)
-- VALUES (1, 'test-token-12345', NOW() + INTERVAL '24 hours');

-- Vérifier l'insertion:
-- SELECT * FROM password_reset_tokens;

-- Supprimer le test:
-- DELETE FROM password_reset_tokens WHERE token = 'test-token-12345';

-- ============================================
-- 7. COMMANDES UTILES POUR LE DÉPANNAGE
-- ============================================

-- Voir tous les tokens actifs:
-- SELECT * FROM password_reset_tokens WHERE used = FALSE AND expiry_date > NOW();

-- Supprimer un token spécifique:
-- DELETE FROM password_reset_tokens WHERE token = 'token-spécifique';

-- Vider toute la table (ATTENTION - supprime tout):
-- TRUNCATE TABLE password_reset_tokens;

-- ============================================
-- ✓ MIGRATION TERMINÉE
-- ============================================
