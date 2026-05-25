-- Slice 2 : colonnes pour le calcul du surplus / ticket modeste
ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS coverage_rate NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS company_coverage NUMERIC(19, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS patient_surplus NUMERIC(19, 2) DEFAULT 0;

COMMENT ON COLUMN admissions.coverage_rate IS 'Taux de couverture copié depuis l''entreprise au moment de l''admission';
COMMENT ON COLUMN admissions.company_coverage IS 'Montant couvert par l''entreprise (facturation mensuelle)';
COMMENT ON COLUMN admissions.patient_surplus IS 'Ticket modeste / surplus à charge du patient';
