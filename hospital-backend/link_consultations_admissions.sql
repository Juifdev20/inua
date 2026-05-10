-- Script SQL pour lier toutes les consultations existantes à la dernière admission de chaque patient
-- PostgreSQL

-- Étape 1: Mettre à jour les consultations avec la dernière admission de chaque patient
UPDATE consultations c
SET admission_id = (
    SELECT a.id
    FROM admissions a
    WHERE a.patient_id = c.patient_id
    ORDER BY a.created_at DESC
    LIMIT 1
)
WHERE admission_id IS NULL
AND EXISTS (
    SELECT 1
    FROM admissions a
    WHERE a.patient_id = c.patient_id
);

-- Étape 2: Vérifier les mises à jour
SELECT 
    c.id as consultation_id,
    c.patient_id,
    c.admission_id,
    a.created_at as admission_date
FROM consultations c
LEFT JOIN admissions a ON c.admission_id = a.id
WHERE c.admission_id IS NOT NULL
ORDER BY c.patient_id, a.created_at DESC;

-- Étape 3: Compter les consultations sans admission après la mise à jour
SELECT 
    COUNT(*) as consultations_sans_admission,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM consultations) as pourcentage
FROM consultations 
WHERE admission_id IS NULL;

-- Étape 4: Pour les consultations qui n'ont toujours pas d'admission, créer une admission
-- (Cette partie doit être exécutée via l'application ou une procédure stockée)

-- Étape 5: Afficher les patients qui n'ont aucune admission
SELECT DISTINCT
    p.id as patient_id,
    p.first_name,
    p.last_name,
    p.email
FROM consultations c
JOIN patients p ON c.patient_id = p.id
WHERE c.admission_id IS NULL
AND NOT EXISTS (
    SELECT 1 FROM admissions a WHERE a.patient_id = p.id
);

-- Étape 6: Statistiques finales
SELECT 
    'Total consultations' as statut,
    COUNT(*) as nombre
FROM consultations
UNION ALL
SELECT 
    'Consultations avec admission',
    COUNT(*)
FROM consultations 
WHERE admission_id IS NOT NULL
UNION ALL
SELECT 
    'Consultations sans admission',
    COUNT(*)
FROM consultations 
WHERE admission_id IS NULL
UNION ALL
SELECT 
    'Total admissions',
    COUNT(*)
FROM admissions;
