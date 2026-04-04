-- ══════════════════════════════════════════════════════════════════
-- TEST MANUEL DE VALIDATION + CRÉATION FACTURE
-- ══════════════════════════════════════════════════════════════════

-- 1. Vérifier l'état actuel de la prescription 14
SELECT 
    'ÉTAT PRESCRIPTION 14' as info,
    pr.id,
    pr.prescription_code,
    pr.status,
    pr.created_at,
    p.first_name || ' ' || p.last_name as patient_name
FROM prescriptions pr
LEFT JOIN patients p ON pr.patient_id = p.id
WHERE pr.id = 14;

-- 2. Vérifier si une facture existe déjà pour la prescription 14
SELECT 
    'FACTURE EXISTANTE POUR PRESCRIPTION 14' as info,
    i.id,
    i.invoice_code,
    i.status,
    i.department_source,
    i.total_amount,
    i.created_at
FROM invoices i
WHERE i.prescription_id = 14;

-- 3. Forcer la validation de la prescription 14
UPDATE prescriptions 
SET status = 'VALIDEE' 
WHERE id = 14;

-- 4. Créer manuellement la facture pour la prescription 14 (sans ON CONFLICT)
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
    'INV-PHARM-TEST-' || EXTRACT(EPOCH FROM NOW())::bigint,
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
WHERE pr.id = 14
GROUP BY pr.id, pr.patient_id, pr.consultation_id;

-- 5. Vérifier que la facture a été créée
SELECT 
    'VÉRIFICATION FACTURE CRÉÉE' as info,
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
WHERE i.prescription_id = 14 OR i.department_source = 'PHARMACY'
ORDER BY i.created_at DESC;

-- 6. Compter les factures PHARMACY en attente
SELECT 
    'DÉCOMPTE FINAL' as info,
    COUNT(*) as nombre_factures_pharmacy_en_attente
FROM invoices 
WHERE department_source = 'PHARMACY' 
  AND status = 'EN_ATTENTE';
