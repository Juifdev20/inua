-- Script de diagnostic PostgreSQL pour vérifier l'état actuel

-- 1. Vérifier si la table consultation_services existe
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'consultation_services';

-- 2. Vérifier les colonnes de la table consultations
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'consultations'
  AND column_name IN ('exam_total_amount', 'consultation_code', 'patient_id', 'doctor_id')
ORDER BY ordinal_position;

-- 3. Vérifier les colonnes de la table consultation_services
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'consultation_services'
ORDER BY ordinal_position;

-- 4. Vérifier s'il y a des données dans consultation_services
SELECT COUNT(*) as total_liaisons,
       COUNT(DISTINCT consultation_id) as consultations_avec_services
FROM consultation_services;

-- 5. Vérifier les consultations récentes avec exam_total_amount
SELECT 
    c.id,
    c.consultation_code,
    c.exam_total_amount,
    c.status,
    c.created_at,
    COUNT(cs.service_id) as nb_services
FROM consultations c
LEFT JOIN consultation_services cs ON c.id = cs.consultation_id
WHERE c.created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND c.status = 'PENDING_PAYMENT'
GROUP BY c.id, c.consultation_code, c.exam_total_amount, c.status, c.created_at
ORDER BY c.created_at DESC
LIMIT 5;
