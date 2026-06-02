-- Migration SQL pour MySQL/MariaDB
-- Ajout de la colonne beneficiary_name à la table abonnement
-- Date: 2026-06-02

-- Vérifier si la colonne existe déjà avant de l'ajouter
SET @dbname = DATABASE();
SET @tablename = 'abonnement';
SET @columnname = 'beneficiary_name';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      (table_schema = @dbname)
      AND (table_name = @tablename)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @dbname, '.', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(255);')
));

PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Alternative plus simple (si vous êtes sûr que la colonne n'existe pas)
-- ALTER TABLE abonnement ADD COLUMN beneficiary_name VARCHAR(255);

-- Confirmation de la migration
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'abonnement' 
AND COLUMN_NAME = 'beneficiary_name';
