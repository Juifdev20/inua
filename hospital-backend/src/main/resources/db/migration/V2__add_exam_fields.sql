-- Migration Flyway : Ajout des champs pour le circuit de facturation labo et examens

ALTER TABLE consultations ADD COLUMN IF NOT EXISTS exam_amount_paid DECIMAL(19,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS consultation_exams (
    consultation_id BIGINT NOT NULL,
    service_id BIGINT,
    note VARCHAR(255),
    CONSTRAINT fk_consultation_exam_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id)
);

