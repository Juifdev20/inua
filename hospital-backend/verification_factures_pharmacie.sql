-- ══════════════════════════════════════════════════════════════════
-- REQUÊTES SQL DE VÉRIFICATION - FACTURES PHARMACIE
-- ══════════════════════════════════════════════════════════════════

-- 1. Vérifier s'il existe des factures dans la table
SELECT COUNT(*) as total_factures FROM invoices;

-- 2. Vérifier les factures de la pharmacie (department_source = 'PHARMACY')
SELECT 
    id,
    invoice_code,
    status,
    total_amount,
    department_source,
    patient_id,
    prescription_id,
    created_at
FROM invoices 
WHERE department_source = 'PHARMACY'
ORDER BY created_at DESC;

-- 3. Vérifier spécifiquement les factures EN ATTENTE (PENDING)
SELECT 
    i.id,
    i.invoice_code,
    i.status,
    i.total_amount,
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

-- 4. Vérifier les prescriptions validées qui devraient avoir une facture
SELECT 
    pr.id,
    pr.prescription_code,
    pr.status,
    pr.created_at,
    i.id as invoice_id,
    i.invoice_code,
    i.status as invoice_status
FROM prescriptions pr
LEFT JOIN invoices i ON pr.id = i.prescription_id
WHERE pr.status = 'VALIDEE'
ORDER BY pr.created_at DESC;

-- 5. Vérifier les médicaments dans les prescriptions (pour le calcul du montant)
SELECT 
    pr.id as prescription_id,
    pr.prescription_code,
    pr.status,
    COUNT(pi.id) as nombre_medicaments,
    COALESCE(SUM(pi.quantity * m.unit_price), 0) as montant_total_calcule
FROM prescriptions pr
LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE pr.status = 'VALIDEE'
GROUP BY pr.id, pr.prescription_code, pr.status
ORDER BY pr.created_at DESC;

-- 6. Diagnostic complet - prescriptions sans facture
SELECT 
    pr.id,
    pr.prescription_code,
    pr.status as prescription_status,
    pr.created_at as prescription_date,
    CASE 
        WHEN i.id IS NULL THEN '❌ PAS DE FACTURE'
        ELSE '✅ FACTURE CRÉÉE: ' || i.invoice_code
    END as facture_status,
    i.status as invoice_status
FROM prescriptions pr
LEFT JOIN invoices i ON pr.id = i.prescription_id
WHERE pr.status = 'VALIDEE'
ORDER BY pr.created_at DESC;

-- 7. Statistiques globales
SELECT 
    department_source,
    status,
    COUNT(*) as nombre,
    COALESCE(SUM(total_amount), 0) as montant_total
FROM invoices
GROUP BY department_source, status
ORDER BY department_source, status;

-- ══════════════════════════════════════════════════════════════════
-- UTILISATION :
-- 1. Copier-coller ces requêtes dans votre client SQL
-- 2. Exécuter la requête 1 pour voir s'il y a des factures
-- 3. Exécuter la requête 3 pour voir les factures PHARMACY en attente
-- 4. Exécuter la requête 6 pour diagnostiquer les prescriptions validées sans facture
-- ══════════════════════════════════════════════════════════════════
