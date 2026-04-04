-- Fix: Add CASH to the pharmacy_orders payment_method check constraint
-- First, drop the existing constraint, then add a new one with CASH included

-- Step 1: Drop the existing check constraint
ALTER TABLE pharmacy_orders DROP CONSTRAINT IF EXISTS pharmacy_orders_payment_method_check;

-- Step 2: Add new check constraint with all payment methods including CASH
ALTER TABLE pharmacy_orders ADD CONSTRAINT pharmacy_orders_payment_method_check 
CHECK (payment_method IN ('ESPECES', 'CASH', 'CARTE_BANCAIRE', 'VIREMENT', 'CHEQUE', 'ASSURANCE', 'MOBILE_MONEY'));
