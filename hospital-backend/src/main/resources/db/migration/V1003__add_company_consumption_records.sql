-- Table de suivi de la consommation par flux pour les patients abonnés
-- Chaque ligne = un service consommé (consultation, labo, pharmacie, etc.)
CREATE TABLE IF NOT EXISTS company_consumption_records (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id        BIGINT        NOT NULL,
    patient_id        BIGINT        NOT NULL,
    admission_id      BIGINT,
    matricule         VARCHAR(80),

    -- Type de flux : CONSULTATION, LABO, PHARMACIE
    flux_type         VARCHAR(30)   NOT NULL,
    description       VARCHAR(255),

    -- Montants
    total_amount      DECIMAL(19,2) NOT NULL DEFAULT 0.00,
    company_coverage  DECIMAL(19,2) NOT NULL DEFAULT 0.00,
    patient_surplus   DECIMAL(19,2) NOT NULL DEFAULT 0.00,
    coverage_rate     DECIMAL(5,2),

    consumed_at       DATETIME      NOT NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ccr_company   FOREIGN KEY (company_id)  REFERENCES companies(id),
    CONSTRAINT fk_ccr_patient   FOREIGN KEY (patient_id)  REFERENCES patients(id),
    CONSTRAINT fk_ccr_admission FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE SET NULL,

    INDEX idx_ccr_company_date (company_id, consumed_at),
    INDEX idx_ccr_patient      (patient_id),
    INDEX idx_ccr_admission    (admission_id)
);
