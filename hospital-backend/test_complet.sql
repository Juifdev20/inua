-- Script pour créer une consultation COMPLÈTE avec services liés
-- Cela va nous permettre de tester si le système fonctionne

-- 1. Créer une consultation avec exam_total_amount
INSERT INTO consultations (
    consultation_code, patient_id, doctor_id, status, statut, 
    reason_for_visit, consultation_date, created_at, updated_at,
    exam_total_amount
) VALUES (
    'TEST_COMPLET', 33, 7, 'PENDING_PAYMENT', 'PENDING_PAYMENT',
    'Test consultation complète', NOW(), NOW(), NOW(), 45000.00
) ON CONFLICT (consultation_code) DO NOTHING;

-- 2. Lier les services (très important!)
INSERT INTO consultation_services (consultation_id, service_id)
SELECT 
    (SELECT id FROM consultations WHERE consultation_code = 'TEST_COMPLET'),
    s.id
FROM medical_services s  
WHERE s.id IN (1, 2, 3)  -- Adapter selon vos services
LIMIT 3;

-- 3. Créer aussi les prescribed_exams pour compatibilité
INSERT INTO prescribed_exams (consultation_id, service_id, service_name, unit_price, status, created_at)
SELECT 
    (SELECT id FROM consultations WHERE consultation_code = 'TEST_COMPLET'),
    s.id,
    s.nom,
    s.prix,
    'PRESCRIBED',
    NOW()
FROM medical_services s  
WHERE s.id IN (1, 2, 3)
LIMIT 3;

-- 4. Vérifier le résultat complet
SELECT 
    c.consultation_code,
    c.exam_total_amount,
    COUNT(cs.service_id) as nb_services_lies,
    COUNT(pe.id) as nb_prescribed_exams,
    STRING_AGG(s.nom, ', ') as services_noms
FROM consultations c
LEFT JOIN consultation_services cs ON c.id = cs.consultation_id
LEFT JOIN prescribed_exams pe ON c.id = pe.consultation_id
LEFT JOIN medical_services s ON cs.service_id = s.id
WHERE c.consultation_code = 'TEST_COMPLET'
GROUP BY c.consultation_code, c.exam_total_amount;
