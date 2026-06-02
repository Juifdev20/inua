-- Script pour ajouter la colonne beneficiary_name à la table admissions
-- Exécutez ce script dans votre console PostgreSQL

ALTER TABLE admissions ADD COLUMN beneficiary_name VARCHAR(255);
