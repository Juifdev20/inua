-- Script pour créer la table abonnement avec la colonne beneficiary_name
-- Exécutez ce script dans votre console PostgreSQL

CREATE TABLE abonnement (
    id SERIAL PRIMARY KEY,
    beneficiary_name VARCHAR(255),
    -- Ajoutez les autres colonnes nécessaires selon votre application
    -- Par exemple :
    -- start_date DATE,
    -- end_date DATE,
    -- status VARCHAR(50),
    -- amount DECIMAL(10,2),
    -- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
