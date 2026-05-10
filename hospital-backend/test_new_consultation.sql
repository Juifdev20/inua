-- Script de test pour vérifier la création d'une nouvelle consultation avec services
-- Simule ce qui devrait se passer quand un médecin termine une consultation

-- 1. Vérifier que la table consultation_services est bien créée
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'consultation_services';

-- 2. Insérer une consultation de test
INSERT INTO consultations (
    id, consultation_code, patient_id, doctor_id, status, statut, 
    created_at, updated_at, exam_total_amount
) VALUES (
    999, 'TEST_001', 1, 1, 'PENDING_PAYMENT', 'PENDING_PAYMENT',
    NOW(), NOW(), 15000.00
) ON CONFLICT (id) DO NOTHING;

-- 3. Insérer des services pour cette consultation
INSERT INTO consultation_services (consultation_id, service_id)
VALUES 
    (999, 1),
    (999, 2)
ON CONFLICT DO NOTHING;

-- 4. Vérifier le résultat
SELECT 
    c.id,
    c.consultation_code,
    c.exam_total_amount,
    COUNT(cs.service_id) as nb_services,
    STRING_AGG(s.nom, ', ') as services_noms
FROM consultations c
LEFT JOIN consultation_services cs ON c.id = cs.consultation_id
LEFT JOIN medical_services s ON cs.service_id = s.id
WHERE c.id = 999
GROUP BY c.id, c.consultation_code, c.exam_total_amount;
