import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seedDatabase() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Connected to database');

    // Create proper hashed password for admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    // Update or insert admin user
    await connection.query(`
      UPDATE users SET password = ? WHERE email = 'admin@lms.com'
    `, [adminPassword]);
    
    console.log('✅ Admin password updated (admin@lms.com / admin123)');

    // Check if schools exist, if not create them
    const [existingSchools] = await connection.query('SELECT COUNT(*) as count FROM schools');
    if (existingSchools[0].count === 0) {
      await connection.query(`
        INSERT INTO schools (name, address, contact_number, email) VALUES
        ('Delhi Public School', '123 Main Street, New Delhi', '9876543210', 'contact@dps.edu'),
        ('St. Mary School', '456 Park Avenue, Mumbai', '9876543211', 'info@stmary.edu'),
        ('Modern Academy', '789 Lake Road, Bangalore', '9876543212', 'admin@modernacademy.edu')
      `);
      console.log('✅ Added 3 schools');
    }

    // Check if centers exist, if not create them
    const [existingCenters] = await connection.query('SELECT COUNT(*) as count FROM centers');
    if (existingCenters[0].count === 0) {
      await connection.query(`
        INSERT INTO centers (name, address, contact_number, email) VALUES
        ('Learning Hub - North', '100 North Block, Delhi', '9988776655', 'north@learninghub.com'),
        ('Learning Hub - South', '200 South Block, Chennai', '9988776656', 'south@learninghub.com')
      `);
      console.log('✅ Added 2 centers');
    }

    // Get school IDs
    const [schools] = await connection.query('SELECT id FROM schools LIMIT 3');
    
    // Check if classes exist, if not create them
    const [existingClasses] = await connection.query('SELECT COUNT(*) as count FROM classes');
    if (existingClasses[0].count === 0 && schools.length > 0) {
      const schoolId = schools[0].id;
      await connection.query(`
        INSERT INTO classes (school_id, name, grade, section, room_number, academic_year) VALUES
        (?, 'Class 1-A', '1', 'A', '101', '2025-26'),
        (?, 'Class 1-B', '1', 'B', '102', '2025-26'),
        (?, 'Class 2-A', '2', 'A', '201', '2025-26'),
        (?, 'Class 3-A', '3', 'A', '301', '2025-26'),
        (?, 'Class 4-A', '4', 'A', '401', '2025-26')
      `, [schoolId, schoolId, schoolId, schoolId, schoolId]);
      console.log('✅ Added 5 classes');
    }

    // Get class IDs
    const [classes] = await connection.query('SELECT id, school_id FROM classes LIMIT 5');

    // Check if students exist, if not create them
    const [existingStudents] = await connection.query('SELECT COUNT(*) as count FROM students WHERE student_type = "school"');
    if (existingStudents[0].count === 0 && classes.length > 0) {
      const schoolId = classes[0].school_id;
      const classId = classes[0].id;
      
      await connection.query(`
        INSERT INTO students (first_name, last_name, date_of_birth, age, gender, student_type, school_id, class_id, parent_name, parent_contact, enrollment_date) VALUES
        ('Rahul', 'Sharma', '2018-05-15', 7, 'male', 'school', ?, ?, 'Amit Sharma', '9876543001', '2025-04-01'),
        ('Priya', 'Patel', '2018-08-22', 7, 'female', 'school', ?, ?, 'Rajesh Patel', '9876543002', '2025-04-01'),
        ('Arjun', 'Singh', '2018-03-10', 7, 'male', 'school', ?, ?, 'Vikram Singh', '9876543003', '2025-04-01'),
        ('Ananya', 'Gupta', '2018-11-05', 6, 'female', 'school', ?, ?, 'Suresh Gupta', '9876543004', '2025-04-01'),
        ('Rohan', 'Kumar', '2018-07-18', 7, 'male', 'school', ?, ?, 'Manoj Kumar', '9876543005', '2025-04-01')
      `, [schoolId, classId, schoolId, classId, schoolId, classId, schoolId, classId, schoolId, classId]);
      console.log('✅ Added 5 school students');
    }

    // Get center IDs
    const [centers] = await connection.query('SELECT id FROM centers LIMIT 2');

    // Add center students
    const [existingCenterStudents] = await connection.query('SELECT COUNT(*) as count FROM students WHERE student_type = "center"');
    if (existingCenterStudents[0].count === 0 && centers.length > 0) {
      const centerId = centers[0].id;
      
      await connection.query(`
        INSERT INTO students (first_name, last_name, date_of_birth, age, gender, student_type, center_id, school_name_external, parent_name, parent_contact, program_type, class_format) VALUES
        ('Aditya', 'Verma', '2016-02-20', 9, 'male', 'center', ?, 'City Public School', 'Rakesh Verma', '9876543101', 'long_term', 'weekend'),
        ('Sneha', 'Reddy', '2015-09-12', 10, 'female', 'center', ?, 'National School', 'Krishna Reddy', '9876543102', 'short_term', 'weekday'),
        ('Karan', 'Mehta', '2017-04-08', 8, 'male', 'center', ?, 'Global Academy', 'Sunil Mehta', '9876543103', 'holiday_program', 'weekend')
      `, [centerId, centerId, centerId]);
      console.log('✅ Added 3 center students');
    }

    // Create additional users
    const trainerPassword = await bcrypt.hash('trainer123', 10);
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    
    const [existingUsers] = await connection.query('SELECT COUNT(*) as count FROM users WHERE email != "admin@lms.com"');
    if (existingUsers[0].count === 0) {
      await connection.query(`
        INSERT INTO users (email, password, first_name, last_name, role_id, section_type, phone) VALUES
        ('teacher@lms.com', ?, 'Sunita', 'Sharma', 5, 'school', '9876500001'),
        ('trainer@lms.com', ?, 'Rajiv', 'Kumar', 6, 'both', '9876500002'),
        ('principal@lms.com', ?, 'Dr. Meera', 'Iyer', 4, 'school', '9876500003'),
        ('trainerhead@lms.com', ?, 'Vikram', 'Singh', 3, 'both', '9876500004'),
        ('trainer2@lms.com', ?, 'Neha', 'Gupta', 6, 'both', '9876500005')
      `, [teacherPassword, trainerPassword, teacherPassword, trainerPassword, trainerPassword]);
      console.log('✅ Added 5 users');
    }

    // Add user assignments
    const [existingAssignments] = await connection.query('SELECT COUNT(*) as count FROM user_assignments');
    if (existingAssignments[0].count === 0) {
      // Get user IDs
      const [users] = await connection.query('SELECT id, email, section_type FROM users');
      const [roles] = await connection.query('SELECT u.id, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id');
      const roleMap = {};
      roles.forEach(r => roleMap[r.id] = r.role_name);
      
      for (const user of users) {
        const roleName = roleMap[user.id];
        
        // Skip school_teacher - they get assigned via teacher-assignments
        if (roleName === 'school_teacher') {
          // Assign teacher to first school
          if (schools.length > 0) {
            await connection.query(
              'INSERT INTO user_assignments (user_id, school_id, is_primary) VALUES (?, ?, true)',
              [user.id, schools[0].id]
            );
          }
          continue;
        }
        
        if (user.section_type === 'both' || user.section_type === 'school') {
          // Assign to first school
          if (schools.length > 0) {
            await connection.query(
              'INSERT INTO user_assignments (user_id, school_id, is_primary) VALUES (?, ?, true)',
              [user.id, schools[0].id]
            );
          }
        }
        if (user.section_type === 'both' || user.section_type === 'center') {
          // Assign to first center
          if (centers.length > 0) {
            await connection.query(
              'INSERT INTO user_assignments (user_id, center_id, is_primary) VALUES (?, ?, true)',
              [user.id, centers[0].id]
            );
          }
        }
      }
      console.log('✅ Added user assignments (including teacher assignments)');
    }

    // Add trainer assignments
    const [existingTrainerAssignments] = await connection.query('SELECT COUNT(*) as count FROM trainer_assignments');
    if (existingTrainerAssignments[0].count === 0) {
      // Get trainer users
      const [trainers] = await connection.query(`
        SELECT u.id FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE r.name = 'trainer'
      `);
      
      // Get admin user for assigned_by
      const [admins] = await connection.query(`
        SELECT u.id FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE r.name IN ('developer', 'trainer_head')
        LIMIT 1
      `);
      
      if (trainers.length > 0 && admins.length > 0 && schools.length > 0 && centers.length > 0) {
        const adminId = admins[0].id;
        
        // Assign first trainer to first school and first center
        await connection.query(`
          INSERT INTO trainer_assignments (trainer_id, school_id, assigned_by) VALUES (?, ?, ?)
        `, [trainers[0].id, schools[0].id, adminId]);
        
        await connection.query(`
          INSERT INTO trainer_assignments (trainer_id, center_id, assigned_by) VALUES (?, ?, ?)
        `, [trainers[0].id, centers[0].id, adminId]);
        
        // If there's a second trainer, assign to second school/center
        if (trainers.length > 1 && schools.length > 1) {
          await connection.query(`
            INSERT INTO trainer_assignments (trainer_id, school_id, assigned_by) VALUES (?, ?, ?)
          `, [trainers[1].id, schools[1].id, adminId]);
        }
        if (trainers.length > 1 && centers.length > 1) {
          await connection.query(`
            INSERT INTO trainer_assignments (trainer_id, center_id, assigned_by) VALUES (?, ?, ?)
          `, [trainers[1].id, centers[1].id, adminId]);
        }
        
        console.log('✅ Added trainer assignments');
      }
    }

    // Add extra students (added by trainers)
    const [existingExtraStudents] = await connection.query('SELECT COUNT(*) as count FROM students WHERE is_extra = true');
    if (existingExtraStudents[0].count === 0 && classes.length > 0) {
      const [trainers] = await connection.query(`
        SELECT u.id FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE r.name = 'trainer' LIMIT 1
      `);
      
      if (trainers.length > 0) {
        const trainerId = trainers[0].id;
        const schoolId = classes[0].school_id;
        const classId = classes[0].id;
        
        await connection.query(`
          INSERT INTO students (first_name, last_name, date_of_birth, age, gender, student_type, school_id, class_id, parent_name, parent_contact, is_extra, added_by, enrollment_date) VALUES
          ('Vikash', 'Yadav', '2018-01-20', 7, 'male', 'school', ?, ?, 'Ramesh Yadav', '9876543010', true, ?, CURDATE()),
          ('Meera', 'Joshi', '2018-06-15', 7, 'female', 'school', ?, ?, 'Suresh Joshi', '9876543011', true, ?, CURDATE())
        `, [schoolId, classId, trainerId, schoolId, classId, trainerId]);
        
        console.log('✅ Added 2 extra students (shown in yellow)');
      }
    }

    // Add sample timetables for multiple classes (with overlapping periods for trainer view)
    const [existingTimetables] = await connection.query('SELECT COUNT(*) as count FROM timetables');
    if (existingTimetables[0].count === 0 && classes.length >= 3) {
      const schoolId = classes[0].school_id;
      
      // Timetable for Class 1-A
      const [tt1Result] = await connection.query(`
        INSERT INTO timetables (school_id, class_id, name, periods_per_day) VALUES (?, ?, 'Class 1-A Timetable', 6)
      `, [schoolId, classes[0].id]);
      
      await connection.query(`
        INSERT INTO timetable_entries (timetable_id, day_of_week, period_number, start_time, end_time, subject, room_number) VALUES
        (?, 'monday', 1, '09:00', '09:45', 'Robotics', 'Lab 1'),
        (?, 'monday', 2, '10:00', '10:45', 'Electronics', 'Lab 1'),
        (?, 'monday', 3, '11:00', '11:45', 'Coding', 'Lab 1'),
        (?, 'wednesday', 1, '09:00', '09:45', 'Robotics', 'Lab 1'),
        (?, 'wednesday', 2, '10:00', '10:45', 'AI Basics', 'Lab 1'),
        (?, 'friday', 1, '09:00', '09:45', 'Drone', 'Lab 1'),
        (?, 'friday', 2, '10:00', '10:45', 'Project Work', 'Lab 1')
      `, [tt1Result.insertId, tt1Result.insertId, tt1Result.insertId, tt1Result.insertId, tt1Result.insertId, tt1Result.insertId, tt1Result.insertId]);
      
      // Timetable for Class 1-B (overlaps with Class 1-A on Monday Period 1 and Wednesday Period 1)
      const [tt2Result] = await connection.query(`
        INSERT INTO timetables (school_id, class_id, name, periods_per_day) VALUES (?, ?, 'Class 1-B Timetable', 6)
      `, [schoolId, classes[1].id]);
      
      await connection.query(`
        INSERT INTO timetable_entries (timetable_id, day_of_week, period_number, start_time, end_time, subject, room_number) VALUES
        (?, 'monday', 1, '09:00', '09:45', 'Electronics', 'Lab 2'),
        (?, 'monday', 3, '11:00', '11:45', 'Robotics', 'Lab 2'),
        (?, 'tuesday', 1, '09:00', '09:45', 'Coding', 'Lab 2'),
        (?, 'tuesday', 2, '10:00', '10:45', 'AI Basics', 'Lab 2'),
        (?, 'wednesday', 1, '09:00', '09:45', 'Drone', 'Lab 2'),
        (?, 'thursday', 1, '09:00', '09:45', 'Robotics', 'Lab 2'),
        (?, 'friday', 1, '09:00', '09:45', 'Electronics', 'Lab 2')
      `, [tt2Result.insertId, tt2Result.insertId, tt2Result.insertId, tt2Result.insertId, tt2Result.insertId, tt2Result.insertId, tt2Result.insertId]);
      
      // Timetable for Class 2-A (overlaps on Monday Period 1 - now 3 classes at same time!)
      const [tt3Result] = await connection.query(`
        INSERT INTO timetables (school_id, class_id, name, periods_per_day) VALUES (?, ?, 'Class 2-A Timetable', 6)
      `, [schoolId, classes[2].id]);
      
      await connection.query(`
        INSERT INTO timetable_entries (timetable_id, day_of_week, period_number, start_time, end_time, subject, room_number) VALUES
        (?, 'monday', 1, '09:00', '09:45', 'Coding', 'Lab 3'),
        (?, 'monday', 2, '10:00', '10:45', 'Robotics', 'Lab 3'),
        (?, 'tuesday', 2, '10:00', '10:45', 'Electronics', 'Lab 3'),
        (?, 'wednesday', 2, '10:00', '10:45', 'Drone', 'Lab 3'),
        (?, 'thursday', 2, '10:00', '10:45', 'AI Basics', 'Lab 3'),
        (?, 'friday', 1, '09:00', '09:45', 'Project Work', 'Lab 3'),
        (?, 'friday', 2, '10:00', '10:45', 'Coding', 'Lab 3')
      `, [tt3Result.insertId, tt3Result.insertId, tt3Result.insertId, tt3Result.insertId, tt3Result.insertId, tt3Result.insertId, tt3Result.insertId]);
      
      console.log('✅ Added 3 class timetables with overlapping periods');
      console.log('   - Monday Period 1: 3 classes (1-A, 1-B, 2-A)');
      console.log('   - Wednesday Period 1: 2 classes (1-A, 1-B)');
      console.log('   - Friday Period 1: 3 classes (1-A, 1-B, 2-A)');
    }

    // Add sample progress for center students
    const [existingProgress] = await connection.query('SELECT COUNT(*) as count FROM student_progress');
    if (existingProgress[0].count === 0 && centers.length > 0) {
      const [centerStudents] = await connection.query(
        'SELECT id, center_id FROM students WHERE student_type = "center" LIMIT 3'
      );
      
      if (centerStudents.length > 0) {
        for (const student of centerStudents) {
          await connection.query(`
            INSERT INTO student_progress (student_id, center_id, chapter_name, chapter_number, completion_status, evaluation_score, remarks) VALUES
            (?, ?, 'Introduction to Programming', 1, 'completed', 92, 'Excellent understanding of basics'),
            (?, ?, 'Variables and Data Types', 2, 'completed', 85, 'Good progress'),
            (?, ?, 'Control Structures', 3, 'in_progress', NULL, 'Currently learning loops')
          `, [student.id, student.center_id, student.id, student.center_id, student.id, student.center_id]);
        }
        console.log('✅ Added sample progress entries');
      }
    }

    // Add sample attendance for center students
    const [existingAttendance] = await connection.query('SELECT COUNT(*) as count FROM attendance WHERE attendance_type = "center"');
    if (existingAttendance[0].count === 0 && centers.length > 0) {
      const [centerStudents] = await connection.query(
        'SELECT id, center_id FROM students WHERE student_type = "center" LIMIT 3'
      );
      
      if (centerStudents.length > 0) {
        const today = new Date();
        for (let i = 0; i < 10; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          for (const student of centerStudents) {
            const status = Math.random() > 0.2 ? 'present' : 'absent';
            await connection.query(`
              INSERT INTO attendance (student_id, attendance_type, center_id, attendance_date, attendance_time, status) 
              VALUES (?, 'center', ?, ?, '10:00:00', ?)
            `, [student.id, student.center_id, dateStr, status]);
          }
        }
        console.log('✅ Added sample center attendance');
      }
    }

    // Add sample curriculums with subjects and topics
    const [existingCurriculums] = await connection.query('SELECT COUNT(*) as count FROM curriculums');
    if (existingCurriculums[0].count === 0) {
      // Get admin user for created_by
      const [admins] = await connection.query(`
        SELECT u.id FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE r.name IN ('developer', 'trainer_head')
        LIMIT 1
      `);
      
      if (admins.length > 0) {
        const adminId = admins[0].id;
        
        // Create Primary Curriculum
        const [currResult] = await connection.query(`
          INSERT INTO curriculums (name, description, created_by) 
          VALUES ('Primary Curriculum', 'Foundation level curriculum for beginners', ?)
        `, [adminId]);
        const primaryCurrId = currResult.insertId;
        
        // Add subjects to Primary Curriculum
        const subjects = [
          { name: 'Robotics', desc: 'Introduction to robotics and automation' },
          { name: 'Electronics', desc: 'Basic electronics and circuits' },
          { name: 'AI & Machine Learning', desc: 'Fundamentals of artificial intelligence' },
          { name: 'Drone Technology', desc: 'Drone building and programming' }
        ];
        
        for (let i = 0; i < subjects.length; i++) {
          const [subResult] = await connection.query(`
            INSERT INTO curriculum_subjects (curriculum_id, name, description, sort_order)
            VALUES (?, ?, ?, ?)
          `, [primaryCurrId, subjects[i].name, subjects[i].desc, i + 1]);
          
          // Add topics to each subject
          const topicsBySubject = {
            'Robotics': ['Introduction to Robots', 'Sensors and Actuators', 'Basic Programming', 'Building Your First Robot', 'Line Following Robot'],
            'Electronics': ['Circuit Basics', 'LED Projects', 'Resistors and Capacitors', 'Arduino Introduction', 'Simple Circuits'],
            'AI & Machine Learning': ['What is AI?', 'Pattern Recognition', 'Simple ML Models', 'Image Classification', 'Voice Commands'],
            'Drone Technology': ['Drone Components', 'Flight Principles', 'Remote Control Basics', 'Safety Guidelines', 'First Flight']
          };
          
          const topics = topicsBySubject[subjects[i].name] || [];
          for (let j = 0; j < topics.length; j++) {
            await connection.query(`
              INSERT INTO curriculum_topics (subject_id, name, sort_order)
              VALUES (?, ?, ?)
            `, [subResult.insertId, topics[j], j + 1]);
          }
        }
        
        // Create Advanced Curriculum
        const [advCurrResult] = await connection.query(`
          INSERT INTO curriculums (name, description, created_by) 
          VALUES ('Advanced Curriculum', 'Advanced level for experienced students', ?)
        `, [adminId]);
        const advCurrId = advCurrResult.insertId;
        
        // Add one subject to Advanced
        const [advSubResult] = await connection.query(`
          INSERT INTO curriculum_subjects (curriculum_id, name, description, sort_order)
          VALUES (?, 'Advanced Robotics', 'Complex robotics projects', 1)
        `, [advCurrId]);
        
        const advTopics = ['Autonomous Navigation', 'Computer Vision', 'Multi-Robot Systems', 'Industrial Applications'];
        for (let j = 0; j < advTopics.length; j++) {
          await connection.query(`
            INSERT INTO curriculum_topics (subject_id, name, sort_order)
            VALUES (?, ?, ?)
          `, [advSubResult.insertId, advTopics[j], j + 1]);
        }
        
        console.log('✅ Added sample curriculums with subjects and topics');
        
        // Assign curriculums to existing center students
        const [centerStudents] = await connection.query(
          'SELECT id FROM students WHERE student_type = "center" AND curriculum_id IS NULL'
        );
        
        if (centerStudents.length > 0) {
          // Assign first 2 students to Primary, rest to Advanced
          for (let i = 0; i < centerStudents.length; i++) {
            const currId = i < 2 ? primaryCurrId : advCurrId;
            await connection.query(
              'UPDATE students SET curriculum_id = ? WHERE id = ?',
              [currId, centerStudents[i].id]
            );
          }
          console.log('✅ Assigned curriculums to center students');
        }
      }
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Login credentials:');
    console.log('   Admin: admin@lms.com / admin123');
    console.log('   Teacher: teacher@lms.com / teacher123');
    console.log('   Trainer: trainer@lms.com / trainer123');
    console.log('   Trainer 2: trainer2@lms.com / trainer123');
    console.log('   Trainer Head: trainerhead@lms.com / trainer123');
    console.log('   Principal: principal@lms.com / teacher123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDatabase();
