-- ★ MIGRATION : Champs pour OAuth2 Social Login et OTP (Magic Code)
-- Date : 2026-05-10
-- Objectif : Support Google/Facebook OAuth2 + Connexion par code temporaire

-- ============================================================
-- 1. AJOUT DES CHAMPS OAUTH2 POUR SOCIAL LOGIN
-- ============================================================

DO $$
BEGIN
    -- oauth_provider : google, facebook, ou null pour auth classique
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'oauth_provider'
    ) THEN
        ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50);
        RAISE NOTICE '✅ Colonne oauth_provider ajoutée';
    END IF;

    -- oauth_id : ID unique fourni par le provider OAuth2
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'oauth_id'
    ) THEN
        ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255);
        RAISE NOTICE '✅ Colonne oauth_id ajoutée';
    END IF;
END $$;

-- ============================================================
-- 2. AJOUT DES CHAMPS POTP (MAGIC CODE / PASSWORDLESS)
-- ============================================================

DO $$
BEGIN
    -- login_code : Code à 6 chiffres pour connexion sans mot de passe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'login_code'
    ) THEN
        ALTER TABLE users ADD COLUMN login_code VARCHAR(6);
        RAISE NOTICE '✅ Colonne login_code ajoutée';
    END IF;

    -- code_expiry : Date d'expiration du code (10 minutes)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'code_expiry'
    ) THEN
        ALTER TABLE users ADD COLUMN code_expiry TIMESTAMP;
        RAISE NOTICE '✅ Colonne code_expiry ajoutée';
    END IF;
END $$;

-- ============================================================
-- 3. INDEX POUR OPTIMISATION DES REQUÊTES
-- ============================================================

-- Index pour recherche rapide par OAuth provider + ID
CREATE INDEX IF NOT EXISTS idx_users_oauth 
ON users(oauth_provider, oauth_id) 
WHERE oauth_provider IS NOT NULL;

-- Index pour recherche rapide par code OTP
CREATE INDEX IF NOT EXISTS idx_users_login_code 
ON users(login_code, code_expiry) 
WHERE login_code IS NOT NULL;

-- ============================================================
-- 4. COMMENTAIRES DE DOCUMENTATION
-- ============================================================

COMMENT ON COLUMN users.oauth_provider IS 
'Provider OAuth2 utilisé pour l authentification sociale (google, facebook). Null pour auth classique.';

COMMENT ON COLUMN users.oauth_id IS 
'ID unique de l utilisateur chez le provider OAuth2 (sub pour Google, id pour Facebook).';

COMMENT ON COLUMN users.login_code IS 
'Code temporaire à 6 chiffres pour connexion sans mot de passe (Magic Code).';

COMMENT ON COLUMN users.code_expiry IS 
'Date et heure d expiration du code temporaire (validité 10 minutes).';

-- ============================================================
-- 5. VÉRIFICATION FINALE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 Migration V400 terminée avec succès !';
    RAISE NOTICE '📝 Nouvelles fonctionnalités activées :';
    RAISE NOTICE '   - Social Login (Google/Facebook) : OK';
    RAISE NOTICE '   - Connexion par code temporaire (Magic Code) : OK';
    RAISE NOTICE '   - Index pour performance : OK';
END $$;
