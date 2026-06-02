-- Script pour ajouter la colonne beneficiary_name manquante
-- Exécutez ce script dans votre console PostgreSQL

ALTER TABLE abonnement ADD COLUMN beneficiary_name VARCHAR(255);
