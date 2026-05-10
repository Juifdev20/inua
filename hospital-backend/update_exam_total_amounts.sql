-- Update exam_total_amount for existing consultations that have prescribed exams
-- This will populate the exam_total_amount field for consultations created before this field existed

UPDATE consultations c
SET exam_total_amount = (
    SELECT COALESCE(SUM(pe.unit_price), 0)
    FROM prescribed_exams pe 
    WHERE pe.consultation_id = c.id
)
WHERE c.status = 'PENDING_PAYMENT' 
  AND c.exam_total_amount = 0
  AND EXISTS (
    SELECT 1 FROM prescribed_exams pe2 
    WHERE pe2.consultation_id = c.id
  );

-- Check the results
SELECT 
    c.id,
    c.consultation_code,
    c.exam_total_amount,
    c.exam_amount_paid,
    COUNT(pe.id) as exam_count,
    SUM(pe.unit_price) as calculated_total
FROM consultations c
LEFT JOIN prescribed_exams pe ON c.id = pe.consultation_id
WHERE c.status = 'PENDING_PAYMENT'
GROUP BY c.id, c.consultation_code, c.exam_total_amount, c.exam_amount_paid
ORDER BY c.id;
