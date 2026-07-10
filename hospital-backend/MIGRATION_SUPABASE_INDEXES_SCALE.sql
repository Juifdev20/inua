-- ═══════════════════════════════════════════════════════════════════════
-- INDEX DE PERFORMANCE MULTI-TENANT (scalabilité 2000+ hôpitaux)
-- À exécuter dans Supabase → SQL Editor. Idempotent (IF NOT EXISTS).
-- Sans ces index, chaque requête filtrée par hôpital fait un SCAN COMPLET
-- → lenteur → connexions retenues → saturation du pool → coupures.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Colonnes tenant (hospital_id) ──
CREATE INDEX IF NOT EXISTS idx_users_hospital        ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_hospital     ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_user         ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmorders_hospital  ON pharmacy_orders(hospital_id);
CREATE INDEX IF NOT EXISTS idx_auditlogs_hospital    ON audit_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_examens_hospital      ON examens(hospital_id);
CREATE INDEX IF NOT EXISTS idx_medications_hospital  ON medications(hospital_id);
CREATE INDEX IF NOT EXISTS idx_medservices_hospital  ON medical_services(hospital_id);

-- ── Colonnes FK utilisées dans les filtres par hôpital (via jointure) ──
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status  ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_invoices_patient      ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status       ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_consultation ON invoices(consultation_id);
CREATE INDEX IF NOT EXISTS idx_revenues_createdby    ON revenues(created_by_id);
CREATE INDEX IF NOT EXISTS idx_expenses_createdby    ON expenses(created_by_id);
CREATE INDEX IF NOT EXISTS idx_prescexams_consult    ON prescribed_exams(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescexams_status     ON prescribed_exams(status);
CREATE INDEX IF NOT EXISTS idx_pharmorders_patient   ON pharmacy_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_patient    ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_labtests_consult      ON lab_tests(consultation_id);
CREATE INDEX IF NOT EXISTS idx_labtests_patient      ON lab_tests(patient_id);
CREATE INDEX IF NOT EXISTS idx_subpayments_hospital  ON subscription_payments(hospital_id);

-- Mettre à jour les statistiques du planificateur après création des index
ANALYZE;

-- Vérification : liste des index créés
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname='public' AND indexname LIKE 'idx_%'
ORDER BY tablename;
