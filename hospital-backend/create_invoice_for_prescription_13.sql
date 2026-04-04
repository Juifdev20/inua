-- ══════════════════════════════════════════════════════════════════
-- CRÉATION DE LA FACTURE POUR LA PRESCRIPTION ID 13
-- ══════════════════════════════════════════════════════════════════

-- 1. Vérifier les items de la prescription 13
SELECT 
    'VÉRIFICATION ITEMS PRESCRIPTION 13' as info,
    pr.prescription_code,
    pi.quantity,
    m.name as medication_name,
    m.unit_price,
    (pi.quantity * COALESCE(m.unit_price, 0)) as total_item
FROM prescriptions pr
LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pr.id = 13
ORDER BY m.name;

-- 2. Calculer le montant total
SELECT 
    'MONTANT TOTAL PRESCRIPTION 13' as info,
    pr.id as prescription_id,
    pr.prescription_code,
    COUNT(pi.id) as nombre_items,
    COALESCE(SUM(pi.quantity * COALESCE(m.unit_price, 0)), 0) as montant_total
FROM prescriptions pr
LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pr.id = 13
GROUP BY pr.id, pr.prescription_code;

-- 3. Créer la facture pour la prescription 13
INSERT INTO invoices (
    invoice_code, 
    patient_id, 
    consultation_id, 
    prescription_id,
    status, 
    total_amount, 
    paid_amount, 
    department_source, 
    created_at,
    created_by
)
SELECT 
    'INV-PHARM-' || EXTRACT(EPOCH FROM NOW())::bigint,
    pr.patient_id,
    pr.consultation_id,
    pr.id,
    'EN_ATTENTE',
    COALESCE(SUM(pi.quantity * COALESCE(m.unit_price, 0)), 0),
    0,
    'PHARMACY',
    NOW(),
    1
FROM prescriptions pr
LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pr.id = 13
GROUP BY pr.id, pr.patient_id, pr.consultation_id;

-- 4. Vérifier que la facture a été créée
SELECT 
    'FACTURE CRÉÉE AVEC SUCCÈS' as info,
    i.invoice_code,
    i.total_amount,
    i.status,
    i.department_source,
    p.first_name || ' ' || p.last_name as patient_name,
    pr.prescription_code,
    i.created_at
FROM invoices i
LEFT JOIN patients p ON i.patient_id = p.id
LEFT JOIN prescriptions pr ON i.prescription_id = pr.id
WHERE i.prescription_id = 13
ORDER BY i.created_at DESC;
