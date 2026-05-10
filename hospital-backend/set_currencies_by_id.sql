-- =====================================================
-- SCRIPT: Définir les devises médicament par médicament
-- À exécuter manuellement pour chaque médicament NULL
-- =====================================================

-- Voir tous les médicaments avec leur ID et prix actuel
SELECT id, name, unit_price, sale_currency, purchase_currency,
       CASE 
           WHEN purchase_currency = 'USD' THEN '-> DEVRAIT ETRE USD'
           WHEN purchase_currency = 'CDF' THEN '-> DEVRAIT ETRE CDF'
           WHEN unit_price < 1 THEN '-> PROBABLEMENT USD (prix < 1)'
           ELSE '-> A DETERMINER'
       END as indication
FROM medications
WHERE sale_currency IS NULL
ORDER BY id;

-- =====================================================
-- EXEMPLE: Pour marquer des médicaments spécifiques en USD
-- (même ceux à 0.23$ ou tout autre prix)
-- =====================================================

-- Remplacez (1, 2, 3) par les vrais IDs des médicaments que vous voulez en USD
-- UPDATE medications SET sale_currency = 'USD', purchase_currency = 'USD' WHERE id IN (1, 2, 3);

-- Remplacez (4, 5, 6) par les vrais IDs des médicaments que vous voulez en CDF
-- UPDATE medications SET sale_currency = 'CDF', purchase_currency = 'CDF' WHERE id IN (4, 5, 6);

-- =====================================================
-- VÉRIFICATION APRÈS MODIFICATION
-- =====================================================
SELECT id, name, unit_price, sale_currency, purchase_currency
FROM medications
ORDER BY id;
