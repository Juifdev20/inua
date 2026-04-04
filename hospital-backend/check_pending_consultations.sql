-- Check current state of consultations with PENDING_PAYMENT status
SELECT 
    id,
    consultation_code,
    status,
    exam_total_amount,
    exam_amount_paid,
    created_at
FROM consultations 
WHERE status = 'PENDING_PAYMENT' 
ORDER BY created_at DESC;
