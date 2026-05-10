-- ============================================
-- ★ MIGRATION : Table de réinitialisation de mot de passe
-- ============================================

-- Table pour stocker les tokens de réinitialisation
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id)
);

-- ============================================
-- ★ COMMENTAIRES
-- ============================================

COMMENT ON TABLE password_reset_tokens IS 'Tokens de réinitialisation de mot de passe';
COMMENT ON COLUMN password_reset_tokens.user_id IS 'ID de l utilisateur concerné';
COMMENT ON COLUMN password_reset_tokens.token IS 'Token unique de réinitialisation';
COMMENT ON COLUMN password_reset_tokens.expiry_date IS 'Date d expiration du token (24h)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Indique si le token a déjà été utilisé';

-- ============================================
-- ★ PROCÉDURE DE NETTOYAGE (optionnel)
-- ============================================

-- Supprimer les tokens expirés (peut être exécuté périodiquement)
-- DELETE FROM password_reset_tokens WHERE expiry_date < NOW() OR used = TRUE;

-- ============================================
-- ★ VÉRIFICATION
-- ============================================

-- Vérifier que la table a été créée
SELECT COUNT(*) as total_tokens FROM password_reset_tokens;

-- Afficher la structure de la table
DESCRIBE password_reset_tokens;
