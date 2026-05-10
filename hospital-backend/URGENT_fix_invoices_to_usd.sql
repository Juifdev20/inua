-- =====================================================
-- URGENT: Corriger les factures pharmacie vers USD
-- =====================================================

-- Vérifier les factures actuelles avant modification
SELECT 
    i.id,
    i.invoice_code,
    i.total_amount,
    i.currency as devise_actuelle,
    i.status,
    p.prescription_code
FROM invoices i
LEFT JOIN prescriptions p ON i.prescription_id = p.id
WHERE i.department_source = 'PHARMACY'
  AND i.status = 'EN_ATTENTE'
ORDER BY i.id DESC
LIMIT 10;

-- =====================================================
-- CORRECTION: Mettre toutes les factures pharmacie non payées en USD
-- =====================================================
UPDATE invoices 
SET currency = 'USD'
WHERE department_source = 'PHARMACY'
  AND status = 'EN_ATTENTE';

-- =====================================================
-- Vérification après correction
-- =====================================================
SELECT 
    currency,
    COUNT(*) as nombre,
    SUM(total_amount) as montant_total
FROM invoices
WHERE department_source = 'PHARMACY'
GROUP BY currency;
