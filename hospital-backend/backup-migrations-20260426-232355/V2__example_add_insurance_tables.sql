-- ========================================================
-- V2__example_add_insurance_tables.sql
-- Exemple de migration future
-- 
-- Ce fichier montre comment ajouter de nouvelles tables
-- une fois que V1__init_schema.sql est appliquée.
-- 
-- Pour l'utiliser:
-- 1. Renommer selon le prochain numéro disponible
-- 2. Adapter le contenu à vos besoins
-- 3. Redémarrer l'application
-- ========================================================

-- Table des compagnies d'assurance
-- CREATE TABLE IF NOT EXISTS insurance_companies (
--     id BIGSERIAL PRIMARY KEY,
--     company_code VARCHAR(50) NOT NULL UNIQUE,
--     name VARCHAR(255) NOT NULL,
--     contact_person VARCHAR(255),
--     phone VARCHAR(50),
--     email VARCHAR(255),
--     address TEXT,
--     is_active BOOLEAN DEFAULT TRUE,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP
-- );

-- Table des couvertures d'assurance par patient
-- CREATE TABLE IF NOT EXISTS patient_insurances (
--     id BIGSERIAL PRIMARY KEY,
--     patient_id BIGINT NOT NULL REFERENCES patients(id),
--     insurance_company_id BIGINT REFERENCES insurance_companies(id),
--     policy_number VARCHAR(100) NOT NULL,
--     coverage_percentage DECIMAL(5,2) DEFAULT 80.00,
--     valid_from DATE,
--     valid_until DATE,
--     is_primary BOOLEAN DEFAULT FALSE,
--     is_active BOOLEAN DEFAULT TRUE,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP
-- );

-- Index pour les recherches
-- CREATE INDEX IF NOT EXISTS idx_patient_insurances_patient 
-- ON patient_insurances(patient_id);

-- CREATE INDEX IF NOT EXISTS idx_patient_insurances_policy 
-- ON patient_insurances(policy_number);

-- Ajout d'une colonne à une table existante
-- ALTER TABLE patients 
-- ADD COLUMN IF NOT EXISTS primary_insurance_id BIGINT 
-- REFERENCES patient_insurances(id);

-- ========================================================
-- NOTE: Ce fichier est un EXEMPLE et est commenté.
-- Pour l'activer, décommentez les lignes ci-dessus
-- ou remplacez par vos propres modifications.
-- ========================================================
