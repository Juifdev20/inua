-- =====================================================
-- SCRIPT: Corriger les factures existantes en USD
-- =====================================================

-- Voir les factures pharmacie avec leurs devises actuelles
SELECT 
    i.id,
    i.invoice_code,
    i.total_amount,
    i.currency,
    i.status,
    p.prescription_code,
    STRING_AGG(m.name || ' (' || m.sale_currency || ')', ', ') as medicaments
FROM invoices i
LEFT JOIN prescriptions p ON i.prescription_id = p.id
LEFT JOIN prescription_items pi ON pi.prescription_id = p.id
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE i.department_source = 'PHARMACY'
  AND i.currency = 'CDF'
GROUP BY i.id, i.invoice_code, i.total_amount, i.currency, i.status, p.prescription_code
ORDER BY i.id DESC
LIMIT 20;

-- =====================================================
-- OPTION 1: Mettre à jour les factures récentes qui ont 
-- des médicaments en USD vers USD
-- =====================================================
/*
UPDATE invoices 
SET currency = 'USD'
WHERE id IN (
    SELECT DISTINCT i.id
    FROM invoices i
    JOIN prescriptions p ON i.prescription_id = p.id
    JOIN prescription_items pi ON pi.prescription_id = p.id
    JOIN medications m ON pi.medication_id = m.id
    WHERE i.department_source = 'PHARMACY'
      AND i.currency = 'CDF'
      AND m.sale_currency = 'USD'
);
*/

-- =====================================================
-- OPTION 2: Mettre TOUTES les factures pharmacie non payées en USD
-- (à exécuter seulement si vous êtes sûr)
-- =====================================================
/*
UPDATE invoices 
SET currency = 'USD'
WHERE department_source = 'PHARMACY'
  AND status != 'PAYEE'
  AND currency = 'CDF';
*/

-- =====================================================
-- VÉRIFICATION APRÈS CORRECTION
-- =====================================================
SELECT 
    currency,
    COUNT(*) as nombre_factures,
    SUM(total_amount) as montant_total
FROM invoices
WHERE department_source = 'PHARMACY'
GROUP BY currency;
