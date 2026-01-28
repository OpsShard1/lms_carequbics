-- School Curriculum Tables

-- School Curriculums (Grade-based)
CREATE TABLE IF NOT EXISTS school_curriculums (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL, -- e.g., "Grade 5 Robotics Curriculum"
  grade_name VARCHAR(50) NOT NULL, -- e.g., "Grade 5", "Class 6A"
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- School Curriculum Subjects
CREATE TABLE IF NOT EXISTS school_curriculum_subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  curriculum_id INT NOT NULL,
  name VARCHAR(100) NOT NULL, -- e.g., "Robotics", "Electronics"
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (curriculum_id) REFERENCES school_curriculums(id) ON DELETE CASCADE
);

-- School Curriculum Projects/Topics
CREATE TABLE IF NOT EXISTS school_curriculum_projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_id INT NOT NULL,
  name VARCHAR(200) NOT NULL, -- e.g., "Line Following Robot"
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES school_curriculum_subjects(id) ON DELETE CASCADE
);

-- Class Curriculum Assignments (assign curriculum to a class)
CREATE TABLE IF NOT EXISTS class_curriculum_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  curriculum_id INT NOT NULL,
  assigned_by INT NOT NULL, -- user_id of trainer_head
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (curriculum_id) REFERENCES school_curriculums(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  UNIQUE KEY unique_class_curriculum (class_id, curriculum_id)
);

-- Class Project Progress (track which projects are covered by the class)
CREATE TABLE IF NOT EXISTS class_project_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  project_id INT NOT NULL,
  status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
  completion_date DATE,
  remarks TEXT,
  marked_by INT NOT NULL, -- user_id of trainer
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES school_curriculum_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES users(id),
  UNIQUE KEY unique_class_project (class_id, project_id)
);
