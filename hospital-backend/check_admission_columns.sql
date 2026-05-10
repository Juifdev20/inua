-- Vérifier si les colonnes registration_fee et service_fee existent dans la table admissions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admissions' 
AND column_name IN ('registration_fee', 'service_fee', 'total_amount')
ORDER BY column_name;

-- Vérifier les valeurs actuelles dans admissions
SELECT id, patient_id, total_amount, amount_paid, created_at 
FROM admissions 
ORDER BY created_at DESC 
LIMIT 5;
