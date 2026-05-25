-- =====================================================================
-- V1001 : Module Abonnés - Slice 1 (Entreprises + Agents)
-- =====================================================================

CREATE TABLE IF NOT EXISTS companies (
    id                   BIGSERIAL PRIMARY KEY,
    name                 VARCHAR(200)   NOT NULL,
    address              TEXT,
    phone                VARCHAR(50),
    email                VARCHAR(150),
    contact_person       VARCHAR(150),
    contract_number      VARCHAR(100)   UNIQUE,
    subscription_status  VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    coverage_rate        NUMERIC(5,2)   NOT NULL DEFAULT 100.00,
    surplus_rate         NUMERIC(5,2)   NOT NULL DEFAULT 35.00,
    created_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_company_status CHECK (subscription_status IN ('ACTIVE','SUSPENDED','EXPIRED'))
);

CREATE INDEX IF NOT EXISTS idx_company_status ON companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_company_name   ON companies(name);

CREATE TABLE IF NOT EXISTS company_employees (
    id                BIGSERIAL PRIMARY KEY,
    company_id        BIGINT       NOT NULL,
    patient_id        BIGINT       NOT NULL,
    matricule         VARCHAR(80),
    dependant_of_id   BIGINT,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_emp_company   FOREIGN KEY (company_id)      REFERENCES companies(id)        ON DELETE CASCADE,
    CONSTRAINT fk_emp_patient   FOREIGN KEY (patient_id)      REFERENCES patients(id)         ON DELETE CASCADE,
    CONSTRAINT fk_emp_dependant FOREIGN KEY (dependant_of_id) REFERENCES company_employees(id) ON DELETE SET NULL,
    CONSTRAINT uk_company_patient UNIQUE (company_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_company   ON company_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_patient   ON company_employees(patient_id);
CREATE INDEX IF NOT EXISTS idx_employee_matricule ON company_employees(matricule);

-- =====================================================================
-- Colonnes "abonné" sur la table admissions (Slice 1)
-- =====================================================================

ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS is_abonne   BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS company_id  BIGINT,
    ADD COLUMN IF NOT EXISTS matricule   VARCHAR(80);

ALTER TABLE admissions
    DROP CONSTRAINT IF EXISTS fk_admission_company;

ALTER TABLE admissions
    ADD CONSTRAINT fk_admission_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admission_company ON admissions(company_id);
CREATE INDEX IF NOT EXISTS idx_admission_abonne  ON admissions(is_abonne);
