-- LMS Database Schema for MySQL
-- Supports multiple schools and centers with role-based access

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS student_progress;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS timetable_entries;
DROP TABLE IF EXISTS timetables;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS user_assignments;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS centers;
DROP TABLE IF EXISTS schools;
DROP TABLE IF EXISTS roles;

-- =============================================
-- CORE TABLES
-- =============================================

-- Roles table
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
('developer', 'System Administrator - Full system access'),
('owner', 'Organization Owner - Manage schools and centers'),
('trainer_head', 'Academic Manager - Manage trainers and review performance'),
('principal', 'School Administrator - View attendance and reports'),
('school_teacher', 'School Teacher - Manage classes and timetables'),
('trainer', 'Trainer - Mark attendance and track progress'),
('parent', 'Parent - View child progress (read-only)');

-- Schools table
CREATE TABLE schools (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_number VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Centers table
CREATE TABLE centers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_number VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role_id INT NOT NULL,
    section_type ENUM('school', 'center', 'both') DEFAULT 'school',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- User assignments (links users to schools/centers)
CREATE TABLE user_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    school_id INT,
    center_id INT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
    CHECK (school_id IS NOT NULL OR center_id IS NOT NULL)
);

-- Classes table (for schools)
CREATE TABLE classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    grade VARCHAR(20),
    section VARCHAR(10),
    room_number VARCHAR(20),
    teacher_id INT,
    academic_year VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- =============================================
-- STUDENTS TABLES
-- =============================================

-- Students table (unified for both school and center)
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    date_of_birth DATE NOT NULL,
    age INT,
    gender ENUM('male', 'female', 'other'),
    
    -- School/Center Association
    student_type ENUM('school', 'center') NOT NULL,
    school_id INT,
    center_id INT,
    class_id INT,
    school_name_external VARCHAR(255), -- For center students (their actual school)
    
    -- Parent Information
    parent_name VARCHAR(200),
    parent_contact VARCHAR(20),
    parent_alternate_contact VARCHAR(20),
    parent_email VARCHAR(255),
    parent_address TEXT,
    
    -- Background Information (for center students)
    parent_qualification VARCHAR(100),
    parent_occupation VARCHAR(100),
    referral_source VARCHAR(255), -- How did you hear about us?
    
    -- Program Details (for center students)
    program_type ENUM('long_term', 'short_term', 'holiday_program', 'birthday_events'),
    attended_before BOOLEAN DEFAULT FALSE,
    class_format ENUM('weekday', 'weekend'),
    
    -- Status
    enrollment_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
    FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE SET NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);


-- =============================================
-- TIMETABLE TABLES (School Section Only)
-- =============================================

-- Timetables table
CREATE TABLE timetables (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    class_id INT NOT NULL,
    name VARCHAR(100),
    periods_per_day INT NOT NULL DEFAULT 8,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Timetable entries (individual slots)
CREATE TABLE timetable_entries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    timetable_id INT NOT NULL,
    day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
    period_number INT NOT NULL,
    start_time TIME,
    end_time TIME,
    subject VARCHAR(100),
    teacher_id INT,
    room_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- =============================================
-- ATTENDANCE TABLES
-- =============================================

-- Attendance table (unified for both school and center)
CREATE TABLE attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    attendance_type ENUM('school', 'center') NOT NULL,
    
    -- School attendance fields
    school_id INT,
    class_id INT,
    timetable_entry_id INT,
    period_number INT,
    
    -- Center attendance fields
    center_id INT,
    
    -- Common fields
    attendance_date DATE NOT NULL,
    attendance_time TIME,
    status ENUM('present', 'absent', 'late', 'excused') NOT NULL DEFAULT 'absent',
    remarks TEXT,
    marked_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
    FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE SET NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (timetable_entry_id) REFERENCES timetable_entries(id) ON DELETE SET NULL,
    FOREIGN KEY (marked_by) REFERENCES users(id)
);

-- =============================================
-- STUDENT PROGRESS (Center Section Only)
-- =============================================

-- Student progress tracking (chapter-wise)
CREATE TABLE student_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    center_id INT NOT NULL,
    chapter_name VARCHAR(255) NOT NULL,
    chapter_number INT,
    completion_status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
    evaluation_score DECIMAL(5,2),
    remarks TEXT,
    trainer_id INT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES users(id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_center ON students(center_id);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_timetable_entries_day ON timetable_entries(day_of_week);
CREATE INDEX idx_student_progress_student ON student_progress(student_id);

-- =============================================
-- DEFAULT DATA
-- =============================================

-- Insert a default developer user (password: admin123)
INSERT INTO users (email, password, first_name, last_name, role_id, section_type) 
VALUES ('admin@lms.com', '$2a$10$rQnM1.kK8LFmKgGqGqGqGOeQqQqQqQqQqQqQqQqQqQqQqQqQqQqQq', 'System', 'Admin', 1, 'both');
