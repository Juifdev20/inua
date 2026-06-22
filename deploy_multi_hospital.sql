-- ============================================================
-- DEPLOIEMENT MULTI-HOPITAL — Script SQL Supabase
-- ============================================================
-- A exécuter dans l'ordre, ligne par ligne si besoin

-- ============================================================
-- 1. TABLE hospitals (si pas encore créée)
-- ============================================================
CREATE TABLE IF NOT EXISTS hospitals (
    id              BIGSERIAL PRIMARY KEY,
    nom             VARCHAR(255) NOT NULL,
    code            VARCHAR(50)  UNIQUE NOT NULL,
    address         TEXT,
    city            VARCHAR(100),
    country         VARCHAR(100),
    phone           VARCHAR(50),
    email           VARCHAR(255),
    logo_url        TEXT,
    is_active       BOOLEAN      DEFAULT TRUE,
    subscription_plan VARCHAR(50) DEFAULT 'STANDARD',
    max_users       INT          DEFAULT 100,
    admin_email     VARCHAR(255),
    notes           TEXT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Insérer l'hôpital par défaut (id=1)
INSERT INTO hospitals (id, nom, code, is_active, subscription_plan, created_at, updated_at)
VALUES (1, 'Hopital Principal', 'MAIN', true, 'STANDARD', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Réajuster la séquence
SELECT setval('hospitals_id_seq', (SELECT GREATEST(MAX(id), 1) FROM hospitals));

-- ============================================================
-- 2. TABLE hospital_config — MIGRATION depuis l'ancienne structure
-- ============================================================

-- Etape A : Renommer l'ancienne table si elle existe (backup)
ALTER TABLE IF EXISTS hospital_configs RENAME TO hospital_configs_backup;

-- Etape B : Créer la nouvelle table hospital_config avec la structure complète
CREATE TABLE IF NOT EXISTS hospital_config (
    id                      BIGSERIAL PRIMARY KEY,
    hospital_name           VARCHAR(255) NOT NULL DEFAULT 'INUA AFYA',
    hospital_code           VARCHAR(50) UNIQUE,
    hospital_logo_url       TEXT,
    ministry_name           VARCHAR(255),
    department_name         VARCHAR(255),
    zone_name               VARCHAR(255),
    region                  VARCHAR(255),
    city                    VARCHAR(100),
    country                 VARCHAR(100),
    phone_number            VARCHAR(50),
    email                   VARCHAR(255),
    website                 VARCHAR(255),
    address                 TEXT,
    postal_code             VARCHAR(20),
    tax_id                  VARCHAR(100),
    registration_number     VARCHAR(100),
    license_number          VARCHAR(100),
    header_title            VARCHAR(255),
    header_subtitle         VARCHAR(255),
    footer_text             TEXT,
    document_watermark      VARCHAR(255),
    primary_color           VARCHAR(7),
    secondary_color         VARCHAR(7),
    currency_code           VARCHAR(3),
    currency_symbol         VARCHAR(10),
    language                VARCHAR(10),
    timezone                VARCHAR(50),
    date_format             VARCHAR(20),
    enable_logo_on_documents BOOLEAN DEFAULT TRUE,
    enable_watermark        BOOLEAN DEFAULT FALSE,
    enable_signature        BOOLEAN DEFAULT TRUE,
    fiche_price             DECIMAL(19, 2) DEFAULT 3,
    fiche_price_currency    VARCHAR(10) DEFAULT 'USD',
    hospital_id             BIGINT REFERENCES hospitals(id),
    updated_by              BIGINT,
    updated_at              TIMESTAMP,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Etape C : Migrer les données depuis l'ancienne table (si backup existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hospital_configs_backup') THEN
        INSERT INTO hospital_config (hospital_name, hospital_code, hospital_id, created_at, updated_at)
        SELECT 
            CASE 
                WHEN config_key = 'hospitalName' THEN config_value 
                ELSE 'INUA AFYA'
            END,
            'MAIN',
            1,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM hospital_configs_backup
        WHERE config_key = 'hospitalName'
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Si aucune donnée n'a été migrée, insérer une config par défaut
INSERT INTO hospital_config (hospital_name, hospital_code, hospital_id, fiche_price, fiche_price_currency)
SELECT 'INUA AFYA', 'MAIN', 1, 3, 'USD'
WHERE NOT EXISTS (SELECT 1 FROM hospital_config WHERE hospital_id = 1);

-- Index
CREATE INDEX IF NOT EXISTS idx_hospital_config_hospital_id ON hospital_config(hospital_id);

-- ============================================================
-- 3. Ajouter hospital_id sur les tables principales
-- ============================================================

-- Tables déjà dans V2000 (si pas encore fait)
ALTER TABLE users       ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
ALTER TABLE patients    ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
ALTER TABLE admissions  ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
ALTER TABLE invoices    ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);

UPDATE users       SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE patients    SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE departments SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE consultations SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE admissions  SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE invoices    SET hospital_id = 1 WHERE hospital_id IS NULL;

-- Tables multi-tenant manquantes
ALTER TABLE suppliers       ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
ALTER TABLE medications     ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
ALTER TABLE medical_services ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
ALTER TABLE examens         ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
ALTER TABLE companies       ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
ALTER TABLE activities      ADD COLUMN IF NOT EXISTS hospital_id BIGINT;
ALTER TABLE audit_logs      ADD COLUMN IF NOT EXISTS hospital_id BIGINT;

UPDATE suppliers       SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE medications     SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE medical_services SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE examens         SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE companies       SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE activities      SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE audit_logs      SET hospital_id = 1 WHERE hospital_id IS NULL;

-- ============================================================
-- 4. Index de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_hospital_id       ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_hospital_id    ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_departments_hospital_id ON departments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_consultations_hospital  ON consultations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_admissions_hospital     ON admissions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_invoices_hospital       ON invoices(hospital_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_hospital_id   ON suppliers(hospital_id);
CREATE INDEX IF NOT EXISTS idx_medications_hospital_id ON medications(hospital_id);
CREATE INDEX IF NOT EXISTS idx_medical_services_hospital ON medical_services(hospital_id);
CREATE INDEX IF NOT EXISTS idx_examens_hospital_id     ON examens(hospital_id);
CREATE INDEX IF NOT EXISTS idx_companies_hospital_id   ON companies(hospital_id);
CREATE INDEX IF NOT EXISTS idx_activities_hospital_id  ON activities(hospital_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hospital_id  ON audit_logs(hospital_id);
