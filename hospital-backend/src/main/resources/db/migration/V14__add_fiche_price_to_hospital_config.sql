-- Migration: Ajout du prix de la fiche dans la configuration hospitalière
-- Date: 2026-04-16
-- Description: Permet à l'admin de configurer le prix des frais de dossier patient

-- Ajouter la colonne fiche_price avec une valeur par défaut de 5000 (ex: 5000 CDF)
ALTER TABLE hospital_config 
ADD COLUMN IF NOT EXISTS fiche_price DECIMAL(19, 2) DEFAULT 5000;

-- Mettre à jour les enregistrements existants avec la valeur par défaut
UPDATE hospital_config 
SET fiche_price = 5000 
WHERE fiche_price IS NULL;

-- Commentaire sur la colonne
COMMENT ON COLUMN hospital_config.fiche_price IS 'Prix des frais de dossier patient (fiche) - configuré par l admin';
