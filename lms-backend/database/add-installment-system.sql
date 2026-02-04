-- Add installment fields to curriculums table
ALTER TABLE curriculums 
ADD COLUMN duration_months INT DEFAULT 12 COMMENT 'Duration of curriculum in months (number of installments)',
ADD COLUMN classes_per_installment INT DEFAULT 8 COMMENT 'Number of present classes before next installment is due';

-- Add installment tracking to fees_payments table
ALTER TABLE fees_payments
ADD COLUMN payment_type ENUM('full', 'installment') DEFAULT 'full' COMMENT 'Type of payment plan',
ADD COLUMN installment_number INT DEFAULT 0 COMMENT 'Current installment number paid',
ADD COLUMN total_installments INT DEFAULT 1 COMMENT 'Total number of installments',
ADD COLUMN installment_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Amount per installment',
ADD COLUMN attendance_count_at_payment INT DEFAULT 0 COMMENT 'Attendance count when last payment was made';

-- Update existing curriculums with default values
UPDATE curriculums SET duration_months = 12, classes_per_installment = 8 WHERE duration_months IS NULL;
