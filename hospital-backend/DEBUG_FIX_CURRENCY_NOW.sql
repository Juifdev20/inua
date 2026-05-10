-- =====================================================
-- DEBUG & FIX IMMÉDIAT: Devise des factures pharmacie
-- =====================================================

-- 1. Vérifier les factures pharmacie actuelles
SELECT 
    i.id,
    i.invoice_code,
    i.total_amount,
    COALESCE(i.currency, 'NULL') as devise,
    i.status,
    p.prescription_code
FROM invoices i
LEFT JOIN prescriptions p ON i.prescription_id = p.id
WHERE i.department_source = 'PHARMACY'
  AND i.status = 'EN_ATTENTE'
ORDER BY i.id DESC
LIMIT 10;

-- 2. Compter les factures par devise
SELECT 
    COALESCE(currency, 'NULL') as devise,
    COUNT(*) as nombre,
    SUM(total_amount) as montant_total
FROM invoices
WHERE department_source = 'PHARMACY'
  AND status = 'EN_ATTENTE'
GROUP BY currency;

-- =====================================================
-- FIX IMMÉDIAT: Mettre toutes les factures en attente en USD
-- Exécutez cette commande puis redémarrez le frontend
-- =====================================================

UPDATE invoices 
SET currency = 'USD'
WHERE department_source = 'PHARMACY'
  AND status = 'EN_ATTENTE'
  AND (currency IS NULL OR currency = 'CDF');

-- =====================================================
-- Vérification après fix
-- =====================================================
SELECT 
    COALESCE(currency, 'NULL') as devise,
    COUNT(*) as nombre
FROM invoices
WHERE department_source = 'PHARMACY'
  AND status = 'EN_ATTENTE'
GROUP BY currency;
