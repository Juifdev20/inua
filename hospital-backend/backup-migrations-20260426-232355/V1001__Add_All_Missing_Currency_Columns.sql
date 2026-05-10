-- ============================================================
-- MIGRATION: Ajout de toutes les colonnes manquantes
-- Date: 2025-04-26
-- Version: 1001 (évite conflits avec migrations existantes)
-- ============================================================

-- 0. Table finance_transactions (colonnes pour justificatifs)
ALTER TABLE finance_transactions 
ADD COLUMN IF NOT EXISTS justificatif_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS scan_facture_url VARCHAR(500);

-- 1. Table invoices (pour livre-caisse et factures)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

UPDATE invoices 
SET currency = 'CDF' 
WHERE currency IS NULL;

-- 2. Table medical_services (pour examens médicaux)
ALTER TABLE medical_services 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

UPDATE medical_services 
SET currency = 'CDF' 
WHERE currency IS NULL;

-- 3. Table prescribed_exams (pour examens prescrits)
ALTER TABLE prescribed_exams 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

UPDATE prescribed_exams 
SET currency = 'CDF' 
WHERE currency IS NULL;

-- 4. Table medications (pour pharmacie)
ALTER TABLE medications 
ADD COLUMN IF NOT EXISTS purchase_currency VARCHAR(3),
ADD COLUMN IF NOT EXISTS sale_currency VARCHAR(3);

UPDATE medications 
SET purchase_currency = 'CDF' 
WHERE purchase_currency IS NULL;

UPDATE medications 
SET sale_currency = COALESCE(purchase_currency, 'CDF') 
WHERE sale_currency IS NULL;

-- 5. Table lab_tests (pour laboratoire)
ALTER TABLE lab_tests 
ADD COLUMN IF NOT EXISTS currency VARCHAR(255);

UPDATE lab_tests 
SET currency = 'USD' 
WHERE currency IS NULL;

-- 6. Table revenues (colonne currency)
ALTER TABLE revenues 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

UPDATE revenues 
SET currency = 'CDF' 
WHERE currency IS NULL;

-- 7. Table expenses (colonne currency)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

UPDATE expenses 
SET currency = 'CDF' 
WHERE currency IS NULL;

-- 8. Table consultations (champs pour circuit labo)
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS exam_amount_paid DECIMAL(19,2) DEFAULT 0;

-- 9. Table consultation_exams (lien consultation-examens)
CREATE TABLE IF NOT EXISTS consultation_exams (
    consultation_id BIGINT NOT NULL,
    service_id BIGINT,
    note VARCHAR(255),
    CONSTRAINT fk_consultation_exam_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id)
);

-- 10. Table caisses (flux pharmacie-finance)
CREATE TABLE IF NOT EXISTS caisses (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    devise VARCHAR(3) NOT NULL CHECK (devise IN ('CDF', 'USD')),
    solde DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    solde_initial DECIMAL(19, 2) DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    managed_by BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- VÉRIFICATION
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration V1001 terminée: Toutes les colonnes et tables manquantes ont été créées';
END $$;
