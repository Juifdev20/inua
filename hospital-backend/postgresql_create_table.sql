-- Script PostgreSQL direct pour créer la table consultation_services
-- Exécuter ce script manuellement dans PostgreSQL

-- Vérifier si la table existe déjà
DROP TABLE IF EXISTS consultation_services;

-- Créer la table de liaison
CREATE TABLE consultation_services (
    consultation_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    
    PRIMARY KEY (consultation_id, service_id),
    CONSTRAINT fk_consultation_service_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    CONSTRAINT fk_consultation_service_service FOREIGN KEY (service_id) REFERENCES medical_services(id) ON DELETE CASCADE
);

-- Vérifier que la table a été créée
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'consultation_services';

-- Afficher la structure de la table
\d consultation_services
