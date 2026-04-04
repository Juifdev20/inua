-- Script PostgreSQL pour peupler la table consultation_services
-- Exécuter après avoir créé la table

-- Insérer les relations consultation-services basées sur les examens prescrits
INSERT INTO consultation_services (consultation_id, service_id)
SELECT DISTINCT pe.consultation_id, pe.service_id
FROM prescribed_exams pe
WHERE NOT EXISTS (
    SELECT 1 FROM consultation_services cs 
    WHERE cs.consultation_id = pe.consultation_id 
      AND cs.service_id = pe.service_id
);

-- Mettre à jour exam_total_amount pour les consultations qui ont des services mais exam_total_amount = 0
UPDATE consultations c
SET exam_total_amount = (
    SELECT COALESCE(SUM(s.prix), 0)
    FROM consultation_services cs
    JOIN medical_services s ON cs.service_id = s.id
    WHERE cs.consultation_id = c.id
)
WHERE c.exam_total_amount = 0
  AND EXISTS (
    SELECT 1 FROM consultation_services cs2 
    WHERE cs2.consultation_id = c.id
  );

-- Vérifier les résultats
SELECT 
    c.id,
    c.consultation_code,
    c.exam_total_amount,
    COUNT(cs.service_id) as service_count,
    ROUND(SUM(s.prix)) as calculated_total,
    STRING_AGG(s.nom, ', ') as services_names
FROM consultations c
LEFT JOIN consultation_services cs ON c.id = cs.consultation_id
LEFT JOIN medical_services s ON cs.service_id = s.id
WHERE c.status = 'PENDING_PAYMENT'
GROUP BY c.id, c.consultation_code, c.exam_total_amount
ORDER BY c.id;
