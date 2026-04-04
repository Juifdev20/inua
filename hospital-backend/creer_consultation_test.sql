-- Script pour créer une consultation de test complète avec services
-- À exécuter pour tester les nouvelles fonctionnalités

-- 1. Créer une consultation de test
INSERT INTO consultations (
    consultation_code, patient_id, doctor_id, status, statut, 
    reason_for_visit, consultation_date, created_at, updated_at,
    exam_total_amount
) VALUES (
    'TEST_2026', 33, 7, 'PENDING_PAYMENT', 'PENDING_PAYMENT',
    'Test consultation pour vérifier les services', NOW(), NOW(), 35000.00
) ON CONFLICT (consultation_code) DO NOTHING;

-- 2. Lier des services à cette consultation
INSERT INTO consultation_services (consultation_id, service_id)
SELECT 
    c.id, s.id
FROM consultations c, medical_services s  
WHERE c.consultation_code = 'TEST_2026'
  AND s.id IN (1, 2, 3)  -- Hémogramme, Radio, Échographie
LIMIT 3;

-- 3. Vérifier le résultat
SELECT 
    c.id,
    c.consultation_code,
    c.exam_total_amount,
    c.status,
    COUNT(cs.service_id) as nb_services,
    STRING_AGG(s.nom, ', ') as services_noms
FROM consultations c
LEFT JOIN consultation_services cs ON c.id = cs.consultation_id
LEFT JOIN medical_services s ON cs.service_id = s.id
WHERE c.consultation_code = 'TEST_2026'
GROUP BY c.id, c.consultation_code, c.exam_total_amount, c.status;
