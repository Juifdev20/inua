-- V2003: Ensure default hospital exists (idempotent)
-- Inserts the main hospital if the hospitals table is empty
-- Uses the name from system_config (appName) if available

INSERT INTO hospitals (id, nom, code, is_active, subscription_plan, max_users, created_at, updated_at)
SELECT 1,
       COALESCE(
           (SELECT config_value FROM system_config WHERE config_key = 'appName' LIMIT 1),
           (SELECT config_value FROM system_config WHERE config_key = 'hospitalName' LIMIT 1),
           'Hopital Principal'
       ),
       'MAIN', true, 'STANDARD', 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM hospitals WHERE id = 1);

-- Reajust sequence
SELECT setval('hospitals_id_seq', (SELECT GREATEST(MAX(id), 1) FROM hospitals));

-- Assign all orphan rows to hospital 1
UPDATE users       SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE patients    SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE departments SET hospital_id = 1 WHERE hospital_id IS NULL;
