-- Vérifier la prescription 9 et ses items
SELECT 'Prescription 9:' as info;
SELECT p.id, p.prescription_code, p.status, p.patient_id, p.consultation_id
FROM prescriptions p 
WHERE p.id = 9;

-- Vérifier les items de la prescription 9
SELECT 'Items de prescription 9:' as info;
SELECT pi.id, pi.prescription_id, pi.medication_id, pi.quantity, pi.dosage_instructions,
       m.name as medication_name, m.unit_price, m.stock_quantity
FROM prescription_items pi
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pi.prescription_id = 9;

-- Vérifier si une facture existe déjà pour la prescription 9
SELECT 'Facture existante pour prescription 9:' as info;
SELECT i.id, i.invoice_code, i.status, i.total_amount, i.department_source
FROM invoices i 
WHERE i.prescription_id = 9;

-- Vérifier toutes les prescriptions avec items
SELECT 'Toutes les prescriptions avec items:' as info;
SELECT p.id, p.prescription_code, p.status, COUNT(pi.id) as item_count
FROM prescriptions p
LEFT JOIN prescription_items pi ON p.id = pi.prescription_id
GROUP BY p.id, p.prescription_code, p.status
ORDER BY p.id;
