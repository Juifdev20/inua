-- Migration pour ajouter les colonnes currency aux tables revenues et expenses
-- Date: 2026-04-17

-- Ajouter la colonne currency à la table revenues
ALTER TABLE revenues ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'CDF';

-- Ajouter la colonne currency à la table expenses
ALTER TABLE expenses ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'CDF';
