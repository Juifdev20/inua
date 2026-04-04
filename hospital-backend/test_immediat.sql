-- Script de test immédiat pour vérifier si le système fonctionne

-- 1. Créer une consultation de test
INSERT INTO consultations (
    consultation_code, patient_id, doctor_id, status, statut, 
    reason_for_visit, consultation_date, created_at, updated_at,
    exam_total_amount
) VALUES (
    'TEST_IMMEDIAT', 33, 7, 'PENDING_PAYMENT', 'PENDING_PAYMENT',
    'Test pour vérifier la liaison', NOW(), NOW(), NOW(), 35000.00
) ON CONFLICT (consultation_code) DO NOTHING;

-- 2. Vérifier que la consultation est créée
SELECT id, consultation_code, exam_total_amount, status 
FROM consultations 
WHERE consultation_code = 'TEST_IMMEDIAT';

-- 3. Ajouter manuellement les services à cette consultation
INSERT INTO consultation_services (consultation_id, service_id)
SELECT 
    (SELECT id FROM consultations WHERE consultation_code = 'TEST_IMMEDIAT'),
    s.id
FROM medical_services s  
WHERE s.id IN (1, 2, 3)  -- Adapter selon vos services existants
LIMIT 3;

-- 4. Vérifier que les services sont bien liés
SELECT 
    c.consultation_code,
    c.exam_total_amount,
    COUNT(cs.service_id) as nb_services,
    STRING_AGG(s.nom, ', ') as services_noms
FROM consultations c
LEFT JOIN consultation_services cs ON c.id = cs.consultation_id
LEFT JOIN medical_services s ON cs.service_id = s.id
WHERE c.consultation_code = 'TEST_IMMEDIAT'
GROUP BY c.consultation_code, c.exam_total_amount;
