-- DEBUG LIVRE DE CAISSE - Vue Détaillée
-- Exécutez ce script dans PostgreSQL pour vérifier les données

-- 1. Vérifier les revenus existants pour la période
SELECT 
    r.id, 
    r.date, 
    r.amount, 
    r.currency, 
    r.source,
    r.reference_invoice_id,
    r.created_by_id,
    r.description
FROM revenues r
WHERE CAST(r.date AS DATE) BETWEEN '2026-04-01' AND '2026-04-20'
ORDER BY r.date DESC;

-- 2. Vérifier si les revenus ont des factures associées
SELECT 
    r.id as revenue_id,
    r.reference_invoice_id,
    i.id as invoice_id,
    i.patient_id,
    p.first_name,
    p.last_name
FROM revenues r
LEFT JOIN invoices i ON r.reference_invoice_id = i.id
LEFT JOIN patients p ON i.patient_id = p.id
WHERE CAST(r.date AS DATE) BETWEEN '2026-04-01' AND '2026-04-20';

-- 3. Tester la requête exacte du Livre de Caisse (simplifiée)
SELECT 
    t.id,
    t.date as transaction_date,
    t.type,
    t.description,
    t.document,
    t.devise,
    t.montant,
    t.patient_nom,
    t.caissier_id,
    t.caissier_nom
FROM (
    SELECT 
        r.id,
        r.date,
        'ENTREE' as type,
        r.description,
        COALESCE(r.receipt_number, CONCAT('REC-', r.id)) as document,
        r.currency as devise,
        r.amount as montant,
        p.last_name as patient_nom,
        u.id as caissier_id,
        CONCAT(u.first_name, ' ', u.last_name) as caissier_nom,
        r.created_at
    FROM revenues r
    LEFT JOIN users u ON r.created_by_id = u.id
    LEFT JOIN invoices i ON r.reference_invoice_id = i.id
    LEFT JOIN patients p ON i.patient_id = p.id
    WHERE CAST(r.date AS DATE) BETWEEN '2026-04-01' AND '2026-04-20'
) t
ORDER BY t.date, t.created_at;
