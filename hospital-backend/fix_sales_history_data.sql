-- ============================================================
-- CORRECTION DES DONNÉES PHARMACY_ORDERS POUR L'HISTORIQUE DES VENTES
-- ============================================================

-- 1. Vérifier les commandes existantes
SELECT 
    id, 
    order_code, 
    order_type, 
    status,
    created_at,
    total_amount,
    CASE 
        WHEN order_type IS NULL THEN 'NULL order_type'
        WHEN created_at IS NULL THEN 'NULL created_at'
        ELSE 'OK'
    END as issue
FROM pharmacy_orders 
ORDER BY id DESC
LIMIT 10;

-- 2. Mettre à jour les commandes avec order_type NULL
UPDATE pharmacy_orders 
SET order_type = 'VENTE_DIRECTE'
WHERE order_type IS NULL;

-- 3. Mettre à jour les commandes avec created_at NULL (mettre la date actuelle)
UPDATE pharmacy_orders 
SET created_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL;

-- 4. Vérifier le nombre de commandes corrigées
SELECT 
    'Commandes avec VENTE_DIRECTE' as description,
    COUNT(*) as count
FROM pharmacy_orders 
WHERE order_type = 'VENTE_DIRECTE';

-- 5. Vérifier les commandes qui devraient apparaître dans l'historique ce mois-ci
SELECT 
    id,
    order_code,
    order_type,
    status,
    created_at,
    total_amount
FROM pharmacy_orders 
WHERE (order_type = 'VENTE_DIRECTE' OR order_type IS NULL)
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY created_at DESC;
