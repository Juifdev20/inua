-- Migration Flyway : Ajout du champ exam_total_amount pour le montant total des examens

ALTER TABLE consultations ADD COLUMN IF NOT EXISTS exam_total_amount DECIMAL(19,2) DEFAULT 0;
