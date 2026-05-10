-- =====================================================
-- MIGRATION COMPLÈTE - Mise à jour schéma Inua Afya
-- À exécuter sur Supabase avant le déploiement
-- =====================================================

-- -----------------------------------------------------
-- 1. TABLE USERS - Colonnes OAuth2 et Magic Code
-- -----------------------------------------------------
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS login_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS code_expiry TIMESTAMP;

-- -----------------------------------------------------
-- 2. TABLE PHARMACY_ORDERS - Colonnes manquantes
-- -----------------------------------------------------
ALTER TABLE pharmacy_orders
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS order_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS supplier_id BIGINT,
ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- -----------------------------------------------------
-- 3. TABLE USERS - Autres colonnes potentiellement manquantes
-- -----------------------------------------------------
ALTER TABLE users
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'fr';

-- -----------------------------------------------------
-- 4. INDEX pour performances
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX IF NOT EXISTS idx_users_login_code ON users(login_code) WHERE login_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_currency ON pharmacy_orders(currency);

-- -----------------------------------------------------
-- 5. Vérification
-- -----------------------------------------------------
SELECT 'Migration terminée avec succès!' as status;
