-- Add department_source column to invoices table
-- This column is needed to filter invoices by department (PHARMACY, RECEPTION, LABORATORY, etc.)

ALTER TABLE invoices 
ADD COLUMN department_source VARCHAR(50);

-- Update existing invoices to have a default department source
-- For now, we'll set existing invoices to RECEPTION as they were likely created before this field existed
UPDATE invoices 
SET department_source = 'RECEPTION' 
WHERE department_source IS NULL;

-- Add a check constraint to ensure valid values
ALTER TABLE invoices 
ADD CONSTRAINT chk_department_source 
CHECK (department_source IN ('RECEPTION', 'PHARMACY', 'LABORATORY', 'RADIOLOGY', 'IMAGING'));

-- Create index for better performance on queries filtering by department and status
CREATE INDEX idx_invoices_status_department ON invoices(status, department_source);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
  AND column_name = 'department_source';
