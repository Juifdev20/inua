-- ★ MIGRATION : Champs pour le système de création automatique de comptes
-- Date : 2026-05-10
-- Auteur : Inua Afya Dev Team

-- ============================================================
-- 1. VÉRIFICATION ET AJOUT DU CHAMP must_change_password
-- ============================================================

DO $$
BEGIN
    -- Vérifier si la colonne existe déjà
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'must_change_password'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN must_change_password BOOLEAN DEFAULT true;
        
        RAISE NOTICE '✅ Colonne must_change_password ajoutée à la table users';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne must_change_password existe déjà';
    END IF;
END $$;

-- ============================================================
-- 2. MISE À JOUR DES COMPTES EXISTANTS
-- ============================================================

-- Pour les comptes existants, ne pas forcer le changement (déjà actifs)
UPDATE users 
SET must_change_password = false 
WHERE must_change_password IS NULL 
   OR must_change_password = true;

-- Comptes créés automatiquement (nouveaux) auront must_change_password = true par défaut

-- ============================================================
-- 3. VÉRIFICATION DE LA STRUCTURE EMAIL (nullable)
-- ============================================================

DO $$
BEGIN
    -- Vérifier la contrainte de nullité sur email
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'email'
        AND is_nullable = 'NO'
    ) THEN
        RAISE NOTICE '⚠️ La colonne email est NOT NULL - vérifiez les données existantes';
    ELSE
        RAISE NOTICE '✅ La colonne email est nullable (correct)';
    END IF;
END $$;

-- ============================================================
-- 4. INDEX POUR OPTIMISATION (si nécessaire)
-- ============================================================

-- Index sur must_change_password pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_users_must_change_password 
ON users(must_change_password) 
WHERE must_change_password = true;

-- ============================================================
-- 5. COMMENTAIRES DE DOCUMENTATION
-- ============================================================

COMMENT ON COLUMN users.must_change_password IS 
'Indique si l utilisateur doit changer son mot de passe au prochain login. 
Défaut: true pour les nouveaux comptes, false après changement.';

-- ============================================================
-- VÉRIFICATION FINALE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 Migration V300 terminée avec succès !';
    RAISE NOTICE '📝 Résumé :';
    RAISE NOTICE '   - Champ must_change_password : OK';
    RAISE NOTICE '   - Index créé : OK';
    RAISE NOTICE '   - Commentaire ajouté : OK';
END $$;
