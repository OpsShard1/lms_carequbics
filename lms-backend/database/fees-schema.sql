-- Add fees column to curriculums table
ALTER TABLE curriculums ADD COLUMN IF NOT EXISTS fees DECIMAL(10, 2) DEFAULT 0.00;

-- Create fees_payments table
CREATE TABLE IF NOT EXISTS fees_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  curriculum_id INT NOT NULL,
  total_fees DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0.00,
  amount_pending DECIMAL(10, 2) DEFAULT 0.00,
  payment_status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (curriculum_id) REFERENCES curriculums(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student_curriculum (student_id, curriculum_id)
);

-- Create fees_transactions table
CREATE TABLE IF NOT EXISTS fees_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fees_payment_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('cash', 'card', 'upi', 'bank_transfer', 'cheque', 'other') DEFAULT 'cash',
  transaction_reference VARCHAR(255),
  payment_date DATE NOT NULL,
  remarks TEXT,
  recorded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fees_payment_id) REFERENCES fees_payments(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Create index for faster queries
CREATE INDEX idx_fees_payment_status ON fees_payments(payment_status);
CREATE INDEX idx_fees_student ON fees_payments(student_id);
CREATE INDEX idx_fees_curriculum ON fees_payments(curriculum_id);
CREATE INDEX idx_transaction_date ON fees_transactions(payment_date);
