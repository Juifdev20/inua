-- ============================================================
-- V2000 : Multi-tenant support — table hospitals + hospital_id
-- Stratégie : shared schema avec discriminateur hospital_id
-- L'hôpital existant devient automatiquement hospital_id = 1
-- ============================================================

-- 1. Créer la table hospitals
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

-- 2. Insérer l'hôpital par défaut (données existantes = hôpital 1)
INSERT INTO hospitals (id, nom, code, is_active, subscription_plan, created_at, updated_at)
VALUES (1, 'Hopital Principal', 'MAIN', true, 'STANDARD', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Réajuster la séquence après l'insertion manuelle avec id=1
SELECT setval('hospitals_id_seq', (SELECT MAX(id) FROM hospitals));

-- 3. Ajouter hospital_id à la table users (nullable pour compatibilité)
ALTER TABLE users ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
UPDATE users SET hospital_id = 1 WHERE hospital_id IS NULL;

-- 4. Ajouter hospital_id à la table patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
UPDATE patients SET hospital_id = 1 WHERE hospital_id IS NULL;

-- 5. Ajouter hospital_id à la table departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
UPDATE departments SET hospital_id = 1 WHERE hospital_id IS NULL;

-- 6. Ajouter hospital_id aux autres tables principales
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
UPDATE consultations SET hospital_id = 1 WHERE hospital_id IS NULL;

ALTER TABLE admissions ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
UPDATE admissions SET hospital_id = 1 WHERE hospital_id IS NULL;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id);
UPDATE invoices SET hospital_id = 1 WHERE hospital_id IS NULL;

-- 7. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_users_hospital_id       ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_hospital_id    ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_departments_hospital_id ON departments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_consultations_hospital  ON consultations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_admissions_hospital     ON admissions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_invoices_hospital       ON invoices(hospital_id);
