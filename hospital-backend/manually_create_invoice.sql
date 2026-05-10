-- ══════════════════════════════════════════════════════════════════
-- CRÉATION MANUELLE D'UNE FACTURE PHARMACIE POUR UNE PRESCRIPTION VALIDÉE
-- ══════════════════════════════════════════════════════════════════

-- 1. Trouver la dernière prescription validée sans facture
SELECT 
    'DERNIÈRE PRESCRIPTION VALIDÉE SANS FACTURE' as info,
    pr.id,
    pr.prescription_code,
    pr.status,
    pr.created_at,
    p.first_name || ' ' || p.last_name as patient_name
FROM prescriptions pr
LEFT JOIN invoices i ON pr.id = i.prescription_id
LEFT JOIN patients p ON pr.patient_id = p.id
WHERE pr.status = 'VALIDEE' 
  AND i.id IS NULL
ORDER BY pr.created_at DESC
LIMIT 1;

-- 2. Vérifier les items de cette prescription
SELECT 
    'ITEMS DE LA PRESCRIPTION' as info,
    pr.prescription_code,
    pi.quantity,
    m.name as medication_name,
    m.unit_price,
    (pi.quantity * COALESCE(m.unit_price, 0)) as total_item,
    COUNT(pi.id) as total_items
FROM prescriptions pr
LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pr.status = 'VALIDEE' 
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.prescription_id = pr.id)
GROUP BY pr.id, pr.prescription_code, pi.id, pi.quantity, m.name, m.unit_price
ORDER BY pr.created_at DESC, m.name;

-- 3. Calculer le montant total pour la facture
SELECT 
    'MONTANT TOTAL À FACTURER' as info,
    pr.id as prescription_id,
    pr.prescription_code,
    COUNT(pi.id) as nombre_items,
    COALESCE(SUM(pi.quantity * COALESCE(m.unit_price, 0)), 0) as montant_total
FROM prescriptions pr
LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pr.status = 'VALIDEE' 
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.prescription_id = pr.id)
GROUP BY pr.id, pr.prescription_code
ORDER BY pr.created_at DESC
LIMIT 1;

-- 4. Créer manuellement la facture (adapter l'ID de prescription si nécessaire)
-- DÉCOMMENTEZ ET EXÉCUTEZ CETTE REQUÊTE APRÈS AVOIR IDENTIFIÉ LA PRESCRIPTION

/*
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
    created_by_id
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
WHERE pr.id = VOTRE_PRESCRIPTION_ID  -- ← REMPLACEZ AVEC L'ID RÉEL
GROUP BY pr.id, pr.patient_id, pr.consultation_id;
*/

-- 5. Vérifier que la facture a été créée
-- EXÉCUTEZ CECI APRÈS LA CRÉATION DE LA FACTURE
SELECT 
    'FACTURE CRÉÉE' as info,
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
WHERE i.department_source = 'PHARMACY' 
  AND i.status = 'EN_ATTENTE'
ORDER BY i.created_at DESC;
