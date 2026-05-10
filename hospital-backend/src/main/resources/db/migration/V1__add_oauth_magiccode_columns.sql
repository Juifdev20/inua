-- Migration: Ajout des colonnes OAuth2 et Magic Code
-- Date: 2024-05-10

-- Ajout des colonnes pour OAuth2 dans la table users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS login_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS code_expiry TIMESTAMP;

-- Index pour améliorer les performances de recherche OAuth
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);

-- Index pour la recherche par login_code
CREATE INDEX IF NOT EXISTS idx_users_login_code ON users(login_code) WHERE login_code IS NOT NULL;
