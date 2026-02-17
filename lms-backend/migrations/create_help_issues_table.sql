-- Create help_issues table
CREATE TABLE IF NOT EXISTS help_issues (
  id INT PRIMARY KEY AUTO_INCREMENT,
  section VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  reported_by INT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at DATETIME NULL,
  resolved_by INT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_section (section),
  INDEX idx_is_resolved (is_resolved),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);
