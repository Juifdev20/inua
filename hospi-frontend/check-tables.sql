-- Script pour vérifier les tables existantes dans votre base de données

-- Pour PostgreSQL
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Pour MySQL/MariaDB
SHOW TABLES;

-- Pour SQLite
.tables
