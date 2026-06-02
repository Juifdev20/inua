-- Script SQL simple pour ajouter la colonne beneficiary_name
-- Copiez-collez ce script directement dans votre console de base de données

ALTER TABLE abonnement ADD COLUMN beneficiary_name VARCHAR(255);
