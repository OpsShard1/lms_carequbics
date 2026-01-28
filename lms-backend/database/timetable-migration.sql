-- ============================================
-- TIMETABLE SYSTEM MIGRATION
-- ============================================
-- This migration drops the old complex timetable system
-- and creates a new simplified system with ONE master
-- timetable per school.
--
-- IMPORTANT: Run this in the correct order to avoid
-- foreign key constraint errors.
-- ============================================

-- Step 1: Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Step 2: Drop old timetable tables
DROP TABLE IF EXISTS timetable_entries;
DROP TABLE IF EXISTS timetables;

-- Step 3: Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Step 4: Create new simplified timetable schema

-- One master timetable per school
CREATE TABLE IF NOT EXISTS school_timetables (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  INDEX idx_school (school_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Period definitions (e.g., Period 1: 9:00-9:45, Period 2: 9:45-10:30)
CREATE TABLE IF NOT EXISTS timetable_periods (
  id INT PRIMARY KEY AUTO_INCREMENT,
  timetable_id INT NOT NULL,
  period_number INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (timetable_id) REFERENCES school_timetables(id) ON DELETE CASCADE,
  UNIQUE KEY unique_period (timetable_id, period_number),
  INDEX idx_timetable (timetable_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Days of the week the school operates
CREATE TABLE IF NOT EXISTS timetable_days (
  id INT PRIMARY KEY AUTO_INCREMENT,
  timetable_id INT NOT NULL,
  day_of_week INT NOT NULL COMMENT '1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (timetable_id) REFERENCES school_timetables(id) ON DELETE CASCADE,
  UNIQUE KEY unique_day (timetable_id, day_of_week),
  INDEX idx_timetable (timetable_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Class schedule assignments (which classes are in which period/day)
-- Multiple classes can be in the same period
CREATE TABLE IF NOT EXISTS timetable_class_schedule (
  id INT PRIMARY KEY AUTO_INCREMENT,
  timetable_id INT NOT NULL,
  class_id INT NOT NULL,
  day_of_week INT NOT NULL COMMENT '1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday',
  period_number INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (timetable_id) REFERENCES school_timetables(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  INDEX idx_timetable_day_period (timetable_id, day_of_week, period_number),
  INDEX idx_class (class_id),
  INDEX idx_timetable (timetable_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Run this SQL file in your database
-- 2. Optionally run: node lms-backend/database/seed-timetable.js
--    to create sample timetable data
-- 3. Test the new timetable system in the UI
-- ============================================
