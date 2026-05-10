-- Add content storage columns to patient_document table
-- This migration adds support for storing document binary content in PostgreSQL
-- Compatible with Render's ephemeral filesystem

-- Add content column to store binary data
ALTER TABLE patient_document 
ADD COLUMN IF NOT EXISTS content bytea;

-- Add file_size column to store file size in bytes
ALTER TABLE patient_document 
ADD COLUMN IF NOT EXISTS file_size bigint;

-- Add mime_type column to store MIME type (e.g., application/pdf, image/jpeg)
ALTER TABLE patient_document 
ADD COLUMN IF NOT EXISTS mime_type varchar(255);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'patient_document' 
  AND column_name IN ('content', 'file_size', 'mime_type')
ORDER BY column_name;
