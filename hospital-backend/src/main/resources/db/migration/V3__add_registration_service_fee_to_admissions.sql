-- ============================================================
-- V3__add_registration_service_fee_to_admissions.sql
-- Migration: Ajout des colonnes registration_fee et service_fee à la table admissions
-- Date: 2026-04-29
-- Objectif: Séparer les frais de dossier des frais de service pour une meilleure traçabilité
-- ============================================================

-- ============================================================
-- 1. AJOUT DES COLONNES registration_fee ET service_fee
-- ============================================================

-- Ajouter la colonne registration_fee (frais de dossier)
ALTER TABLE admissions 
ADD COLUMN IF NOT EXISTS registration_fee DECIMAL(19, 2) DEFAULT 0.00;

-- Ajouter la colonne service_fee (frais de service/consultation)
ALTER TABLE admissions 
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(19, 2) DEFAULT 0.00;

-- ============================================================
-- 2. MIGRATION DES DONNÉES EXISTANTES
-- ============================================================

-- Pour les admissions existantes, on suppose que :
-- - Si total_amount > 0, on considère que c'est le service_fee
-- - registration_fee reste à 0 pour les admissions existantes (on ne peut pas savoir rétroactivement)
-- Note: Les admissions futures auront les frais correctement séparés

UPDATE admissions 
SET service_fee = total_amount 
WHERE service_fee = 0 AND total_amount > 0;

-- ============================================================
-- 3. AJOUT DE COMMENTAIRES
-- ============================================================

COMMENT ON COLUMN admissions.registration_fee IS 'Frais de dossier patient (payé une seule fois lors de la première admission)';
COMMENT ON COLUMN admissions.service_fee IS 'Frais de service/consultation';
COMMENT ON COLUMN admissions.total_amount IS 'Montant total (registration_fee + service_fee)';

-- ============================================================
-- 4. INDEX POUR OPTIMISATION
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_admissions_registration_fee ON admissions(registration_fee);
CREATE INDEX IF NOT EXISTS idx_admissions_service_fee ON admissions(service_fee);

-- ============================================================
-- FIN DE MIGRATION
-- ============================================================
