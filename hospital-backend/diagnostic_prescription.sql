-- ══════════════════════════════════════════════════════════════════
-- DIAGNOSTIC COMPLET DES PRESCRIPTIONS ET FACTURES
-- ══════════════════════════════════════════════════════════════════

-- 1. Toutes les prescriptions avec leur statut
SELECT 
    '=== PRESCRIPTIONS ===' as section,
    pr.id,
    pr.prescription_code,
    pr.status,
    pr.created_at,
    p.first_name || ' ' || p.last_name as patient_name,
    d.first_name || ' ' || d.last_name as doctor_name
FROM prescriptions pr
LEFT JOIN patients p ON pr.patient_id = p.id
LEFT JOIN users d ON pr.doctor_id = d.id
ORDER BY pr.created_at DESC;

-- 2. Toutes les factures de pharmacie
SELECT 
    '=== FACTURES PHARMACY ===' as section,
    i.id,
    i.invoice_code,
    i.status,
    i.total_amount,
    i.department_source,
    i.prescription_id,
    i.created_at,
    p.first_name || ' ' || p.last_name as patient_name
FROM invoices i
LEFT JOIN patients p ON i.patient_id = p.id
WHERE i.department_source = 'PHARMACY' OR i.prescription_id IS NOT NULL
ORDER BY i.created_at DESC;

-- 3. Lien prescriptions-factures
SELECT 
    '=== LIEN PRESCRIPTIONS-FACTURES ===' as section,
    pr.id as prescription_id,
    pr.prescription_code,
    pr.status as prescription_status,
    CASE 
        WHEN i.id IS NULL THEN '❌ PAS DE FACTURE'
        ELSE '✅ FACTURE: ' || i.invoice_code || ' (Statut: ' || i.status || ')'
    END as facture_info,
    i.id as invoice_id,
    i.status as invoice_status,
    i.department_source
FROM prescriptions pr
LEFT JOIN invoices i ON pr.id = i.prescription_id
ORDER BY pr.created_at DESC;

-- 4. Items des prescriptions validées
SELECT 
    '=== ITEMS PRESCRIPTIONS VALIDEES ===' as section,
    pr.prescription_code,
    pr.status,
    pi.quantity,
    m.name as medication_name,
    m.unit_price,
    (pi.quantity * m.unit_price) as total_item
FROM prescriptions pr
LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pr.status = 'VALIDEE'
ORDER BY pr.created_at DESC, m.name;

-- 5. Vérifier les erreurs potentielles
SELECT 
    '=== DIAGNOSTIC ERREURS ===' as section,
    'Prescriptions validées sans facture' as diagnostic,
    COUNT(*) as count
FROM prescriptions pr
LEFT JOIN invoices i ON pr.id = i.prescription_id
WHERE pr.status = 'VALIDEE' AND i.id IS NULL

UNION ALL

SELECT 
    '=== DIAGNOSTIC ERREURS ===' as section,
    'Factures pharmacy sans prescription' as diagnostic,
    COUNT(*) as count
FROM invoices i
WHERE i.department_source = 'PHARMACY' AND i.prescription_id IS NULL

UNION ALL

SELECT 
    '=== DIAGNOSTIC ERREURS ===' as section,
    'Prescriptions sans items' as diagnostic,
    COUNT(*) as count
FROM prescriptions pr
LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
WHERE pr.status = 'VALIDEE' AND pi.id IS NULL;

-- ══════════════════════════════════════════════════════════════════
-- EXÉCUTEZ CE SCRIPT POUR DIAGNOSTIQUER LE PROBLÈME
-- ══════════════════════════════════════════════════════════════════
