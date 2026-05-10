-- ============================================================
-- V2__add_revenues_and_missing_tables.sql
-- Migration: Ajout des tables manquantes et colonnes importantes
-- Date: 2026-04-26
-- ============================================================

-- ============================================================
-- 1. TABLE DES REVENUS (encaissements)
-- ============================================================
CREATE TABLE IF NOT EXISTS revenues (
    id BIGSERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    source VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'CDF',
    reference_invoice_id BIGINT,
    receipt_number VARCHAR(100) UNIQUE,
    description TEXT,
    created_by_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_revenue_user FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_revenue_invoice FOREIGN KEY (reference_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    CONSTRAINT chk_revenue_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_revenue_source CHECK (source IN ('ADMISSION', 'LABORATOIRE', 'PHARMACIE', 'CONSULTATION', 'HOSPITALISATION', 'AUTRE'))
);

-- Index pour les recherches frequentes
CREATE INDEX IF NOT EXISTS idx_revenues_date ON revenues(date DESC);
CREATE INDEX IF NOT EXISTS idx_revenues_source ON revenues(source);
CREATE INDEX IF NOT EXISTS idx_revenues_created_at ON revenues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenues_payment_method ON revenues(payment_method);
CREATE INDEX IF NOT EXISTS idx_revenues_currency ON revenues(currency);

-- Commentaires
COMMENT ON TABLE revenues IS 'Table des encaissements/entrees de caisse hospitaliere';
COMMENT ON COLUMN revenues.amount IS 'Montant encaisse (toujours positif)';
COMMENT ON COLUMN revenues.source IS 'Source du revenu: ADMISSION, LABORATOIRE, PHARMACIE, CONSULTATION, HOSPITALISATION, AUTRE';
COMMENT ON COLUMN revenues.currency IS 'Devise: CDF ou USD';

-- ============================================================
-- 2. AJOUT DES COLONNES MANQUANTES AUX TABLES EXISTANTES
-- ============================================================

-- 2.1 Table hospital_configs - Prix de la fiche patient
-- Creation si inexistante (pour compatibilite avec anciennes versions de V1)
CREATE TABLE IF NOT EXISTS hospital_configs (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMP,
    updated_by_id BIGINT
);
ALTER TABLE hospital_configs 
ADD COLUMN IF NOT EXISTS fiche_price DECIMAL(19, 2) DEFAULT 5000;

COMMENT ON COLUMN hospital_configs.fiche_price IS 'Prix des frais de dossier patient (fiche)';

-- 2.2 Table consultations - Montant total des examens
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS exam_total_amount DECIMAL(19,2) DEFAULT 0;

-- 2.3 Table finance_transactions - URLs des justificatifs
ALTER TABLE finance_transactions 
ADD COLUMN IF NOT EXISTS justificatif_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS scan_facture_url VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_justificatif
ON finance_transactions(justificatif_url) WHERE justificatif_url IS NOT NULL;

COMMENT ON COLUMN finance_transactions.justificatif_url IS 'URL de la piece justificative uploadee par la pharmacie';

-- 2.4 Table invoices - Colonnes currency et department_source si manquantes
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
ADD COLUMN IF NOT EXISTS department_source VARCHAR(50);

-- Mettre a jour les valeurs nulles
UPDATE invoices SET currency = 'USD' WHERE currency IS NULL;
UPDATE invoices SET department_source = 'RECEPTION' WHERE department_source IS NULL;

-- Contraintes de verification (avec DO block pour gerer le cas ou la contrainte existe deja)
DO $$
BEGIN
    ALTER TABLE invoices 
    ADD CONSTRAINT chk_department_source 
    CHECK (department_source IN ('RECEPTION', 'PHARMACY', 'LABORATOIRE', 'RADIOLOGY', 'IMAGING'));
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Contrainte existe deja, on ignore
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_status_department ON invoices(status, department_source);
CREATE INDEX IF NOT EXISTS idx_invoices_currency ON invoices(currency);

-- 2.5 Table medical_services - Devise
ALTER TABLE medical_services 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

UPDATE medical_services SET currency = 'USD' WHERE currency IS NULL;

-- 2.6 Table prescribed_exams - Devise
ALTER TABLE prescribed_exams 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

UPDATE prescribed_exams SET currency = 'USD' WHERE currency IS NULL;

-- 2.7 Table lab_tests - Devise
ALTER TABLE lab_tests 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

UPDATE lab_tests SET currency = 'USD' WHERE currency IS NULL;

-- 2.8 Table medications - Devises d'achat et vente
ALTER TABLE medications 
ADD COLUMN IF NOT EXISTS purchase_currency VARCHAR(3),
ADD COLUMN IF NOT EXISTS sale_currency VARCHAR(3);

UPDATE medications SET purchase_currency = 'USD' WHERE purchase_currency IS NULL;
UPDATE medications SET sale_currency = 'USD' WHERE sale_currency IS NULL;

-- 2.9 Table expenses - Devise
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'CDF';

UPDATE expenses SET currency = 'CDF' WHERE currency IS NULL;

-- 2.10 Table caisses - Table existe peut-etre deja dans V1, ajout colonnes si manquantes
ALTER TABLE caisses 
ADD COLUMN IF NOT EXISTS solde_initial DECIMAL(19, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS managed_by BIGINT REFERENCES users(id);

-- ============================================================
-- 3. CREATION DE TABLES DE LIAISON MANQUANTES
-- ============================================================

-- 3.1 Table consultation_exams (lien consultation-examens)
-- Verifier si la table existe deja avec une structure differente
DO $$
BEGIN
    -- Si la table existe deja avec une autre structure, on ne fait rien
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'consultation_exams'
    ) THEN
        CREATE TABLE consultation_exams (
            consultation_id BIGINT NOT NULL,
            service_id BIGINT,
            exam_name VARCHAR(255),
            exam_price DECIMAL(10,2),
            note VARCHAR(255),
            CONSTRAINT fk_consultation_exam_consultation 
                FOREIGN KEY (consultation_id) REFERENCES consultations(id)
        );
    END IF;
END $$;

-- ============================================================
-- 4. AJOUT DE COLONNES A PATIENT_DOCUMENTS
-- ============================================================

-- Verifier si la table s'appelle patient_documents ou patient_document
DO $$
BEGIN
    -- Pour patient_documents (nom dans V1)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'patient_documents'
    ) THEN
        ALTER TABLE patient_documents 
        ADD COLUMN IF NOT EXISTS content BYTEA,
        ADD COLUMN IF NOT EXISTS file_size BIGINT,
        ADD COLUMN IF NOT EXISTS mime_type VARCHAR(255);
    END IF;
    
    -- Pour patient_document (nom alternatif)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'patient_document'
    ) THEN
        ALTER TABLE patient_document 
        ADD COLUMN IF NOT EXISTS content BYTEA,
        ADD COLUMN IF NOT EXISTS file_size BIGINT,
        ADD COLUMN IF NOT EXISTS mime_type VARCHAR(255);
    END IF;
END $$;

-- ============================================================
-- 5. INDEX SUPPLEMENTAIRES POUR LES PERFORMANCES
-- ============================================================

-- Index sur les colonnes currency
CREATE INDEX IF NOT EXISTS idx_invoices_currency ON invoices(currency);
CREATE INDEX IF NOT EXISTS idx_medical_services_currency ON medical_services(currency);
CREATE INDEX IF NOT EXISTS idx_prescribed_exams_currency ON prescribed_exams(currency);
CREATE INDEX IF NOT EXISTS idx_lab_tests_currency ON lab_tests(currency);
CREATE INDEX IF NOT EXISTS idx_medications_purchase_currency ON medications(purchase_currency);
CREATE INDEX IF NOT EXISTS idx_medications_sale_currency ON medications(sale_currency);
CREATE INDEX IF NOT EXISTS idx_expenses_currency ON expenses(currency);

-- Index sur department_source
CREATE INDEX IF NOT EXISTS idx_invoices_department_source ON invoices(department_source);

-- ============================================================
-- VERIFICATION
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration V2 terminee avec succes:';
    RAISE NOTICE '  - Table revenues creee';
    RAISE NOTICE '  - Colonnes currency ajoutees aux tables financieres';
    RAISE NOTICE '  - Colonnes justificatifs ajoutees';
    RAISE NOTICE '  - Tables de liaison completees';
END $$;
