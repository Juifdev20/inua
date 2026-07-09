-- ═══════════════════════════════════════════════════════════════
-- Migration : workflow d'inscription publique des hôpitaux
-- Ajoute les colonnes de suivi de la demande d'inscription.
-- ddl-auto=update crée déjà les colonnes ; ce script sert au backfill
-- et à garantir un défaut cohérent en production (PostgreSQL).
-- Idempotent : réexécutable sans risque.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS registration_status VARCHAR(20);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS requested_admin_first_name VARCHAR(255);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS requested_admin_last_name VARCHAR(255);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS requested_admin_phone VARCHAR(50);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Tous les hôpitaux existants sont considérés comme déjà approuvés
UPDATE hospitals SET registration_status = 'APPROVED' WHERE registration_status IS NULL;

-- Défaut pour les prochaines insertions faites hors application
ALTER TABLE hospitals ALTER COLUMN registration_status SET DEFAULT 'APPROVED';
