-- Migration: Ajouter les champs pour la réinitialisation de mot de passe
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Créer un index pour accélérer la recherche par token
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
