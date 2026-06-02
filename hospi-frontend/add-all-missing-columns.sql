-- Script pour ajouter toutes les colonnes manquantes à la table admissions
-- Exécutez ce script dans votre console PostgreSQL

ALTER TABLE admissions ADD COLUMN IF NOT EXISTS beneficiary_name VARCHAR(255);
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS subscriber_name VARCHAR(255);
