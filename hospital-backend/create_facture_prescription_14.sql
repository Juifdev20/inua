-- ══════════════════════════════════════════════════════════════════
-- CRÉATION FACTURE POUR PRESCRIPTION 14 (DÉJÀ VALIDÉE)
-- ══════════════════════════════════════════════════════════════════

-- 1. Vérifier les médicaments de la prescription 14
SELECT 
    'MÉDICAMENTS PRESCRIPTION 14' as info,
    pi.id as item_id,
    pi.quantity,
    m.name as medication_name,
    m.unit_price,
    (pi.quantity * COALESCE(m.unit_price, 0)) as total_item
FROM prescription_items pi
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pi.prescription_id = 14;

-- 2. Créer la facture principale
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
WHERE pr.id = 14
GROUP BY pr.id, pr.patient_id, pr.consultation_id
RETURNING id, invoice_code, total_amount;

-- 3. Vérifier que la facture a été créée
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
WHERE i.prescription_id = 14;

-- 4. Compter les factures PHARMACY en attente
SELECT 
    'DÉCOMPTE FINAL PHARMACY' as info,
    COUNT(*) as nombre_factures_pharmacy_en_attente,
    COALESCE(SUM(total_amount), 0) as montant_total
FROM invoices 
WHERE department_source = 'PHARMACY' 
  AND status = 'EN_ATTENTE';
