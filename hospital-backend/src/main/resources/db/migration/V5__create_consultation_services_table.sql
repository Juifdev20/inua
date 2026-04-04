-- Migration Flyway : Création de la table de liaison consultation_services

CREATE TABLE IF NOT EXISTS consultation_services (
    consultation_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    
    PRIMARY KEY (consultation_id, service_id),
    CONSTRAINT fk_consultation_service_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    CONSTRAINT fk_consultation_service_service FOREIGN KEY (service_id) REFERENCES medical_services(id) ON DELETE CASCADE
);
