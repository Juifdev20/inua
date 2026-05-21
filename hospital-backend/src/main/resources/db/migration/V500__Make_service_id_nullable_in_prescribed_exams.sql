-- Make service_id nullable in prescribed_exams table
-- This allows prescribed_exams to be created without a service_id when using the new examen system

-- Drop the NOT NULL constraint on service_id
ALTER TABLE prescribed_exams 
ALTER COLUMN service_id DROP NOT NULL;

-- Also make service_name nullable since it's only needed when service_id is present
ALTER TABLE prescribed_exams 
ALTER COLUMN service_name DROP NOT NULL;
