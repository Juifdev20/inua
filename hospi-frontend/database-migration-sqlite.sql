-- Migration SQL pour SQLite
-- Ajout de la colonne beneficiary_name à la table abonnement
-- Date: 2026-06-02

-- Vérifier si la table existe et si la colonne n'existe pas déjà
-- SQLite n'a pas de INFORMATION_SCHEMA comme PostgreSQL/MySQL

-- Alternative 1: Essayer d'ajouter la colonne (ignorer l'erreur si elle existe)
ALTER TABLE abonnement ADD COLUMN beneficiary_name VARCHAR(255);

-- Alternative 2: Vérifier d'abord la structure de la table
-- PRAGMA table_info(abonnement);

-- Alternative 3: Script plus robuste avec gestion d'erreur
-- (à exécuter dans votre application avec try/catch)

-- Confirmation de la migration
PRAGMA table_info(abonnement);
